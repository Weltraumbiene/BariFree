# /backend/app/scan_controller.py
import threading
import time
from typing import Optional
import requests
from bs4 import BeautifulSoup

from .checker import (
    check_contrast, check_image_alt, check_links,
    check_buttons, check_labels, check_headings, check_aria_roles
)
from .crawler import crawl_website
from .logs import log_message
from .utils import save_latest_scan
from .email import sende_testbenachrichtigung

scan_running = False
scan_result = []

abort_event = threading.Event()
abort_reason = None


def timeout_watcher(seconds: int):
    global abort_reason
    time.sleep(seconds)
    if not abort_event.is_set():
        abort_reason = "timeout"
        log_message(f"Timeout erreicht. Scan wird abgebrochen.")
        abort_event.set()


def run_scan_thread(
    url: str,
    exclude: list,
    full: bool,
    max_depth: int,
    user_email: Optional[str],
    user_name: Optional[str]
):
    global scan_running, scan_result, abort_reason

    if scan_running:
        log_message("Scan wurde bereits gestartet und läuft noch.")
        return

    scan_running = True
    scan_result = []
    abort_reason = None
    abort_event.clear()

    timeout_seconds = 43200  # 12 Stunden Timeout
    threading.Thread(target=timeout_watcher, args=(timeout_seconds,), daemon=True).start()

    try:
        log_message(f"Scan gestartet: {url}")
        log_message(f"Crawltiefe: {max_depth}")
        if exclude:
            log_message(f"Ausschlussmuster: {', '.join(exclude)}")
        log_message(f"Modus: {'Vollscan' if full else 'Nur aktuelle URL'}")

        if not full:
            pages = [{"url": url, "soup": None}]
        else:
            result = crawl_website(
                url,
                exclude_patterns=exclude,
                max_depth=max_depth,
                timeout_seconds=timeout_seconds,
                abort_event=abort_event
            )
            pages = result.get("pages", [])

        log_message(f"Gesammelte Seiten: {len(pages)}")

        issues = []
        for page in pages:
            if abort_event.is_set():
                if abort_reason == "timeout":
                    log_message("Scan aufgrund von Timeout abgebrochen.")
                else:
                    log_message("Scan durch Benutzer abgebrochen.")
                break

            page_url = page["url"]
            soup = page["soup"]

            if not soup:
                try:
                    resp = requests.get(page_url, timeout=5)
                    soup = BeautifulSoup(resp.text, 'html.parser')
                except Exception as e:
                    log_message(f"Fehler beim Nachladen {page_url}: {e}")
                    continue

            log_message(f"Prüfung für: {page_url}")
            for check_func, label in [
                (check_contrast, "Kontraste"),
                (check_image_alt, "Bild ALT-Texte"),
                (check_links, "Links"),
                (check_buttons, "Buttons"),
                (check_labels, "Formulare"),
                (check_headings, "Überschriften"),
                (check_aria_roles, "ARIA-Rollen")
            ]:
                log_message(f"  Prüfe: {label}")
                time.sleep(0.1)
                new_issues = check_func(page_url, soup)
                log_message(f"    {len(new_issues)} Probleme gefunden")
                issues.extend(new_issues)

            log_message(f"Prüfung abgeschlossen: {page_url}")

        seen = set()
        unique_issues = []
        for issue in issues:
            key = (issue.get("type"), issue.get("snippet"))
            if key not in seen:
                seen.add(key)
                unique_issues.append(issue)

        log_message(f"Scan abgeschlossen: {len(unique_issues)} eindeutige Probleme gefunden.")
        save_latest_scan(unique_issues, url)
        scan_result = unique_issues

        if user_email:
            try:
                sende_testbenachrichtigung(
                    empfaenger_email=user_email,
                    benutzername=user_name or "Benutzer"
                )
            except Exception as mail_err:
                log_message(f"Fehler beim Senden der Mail: {mail_err}")

    finally:
        scan_running = False


def start_background_scan(
    url: str,
    exclude: list,
    full: bool,
    max_depth: int,
    user_email: Optional[str],
    user_name: Optional[str]
):
    global scan_running
    if scan_running:
        raise RuntimeError("Ein Scan läuft bereits")
    thread = threading.Thread(
        target=run_scan_thread,
        args=(url, exclude, full, max_depth, user_email, user_name)
    )
    thread.start()


def is_scan_running():
    return scan_running


def get_scan_result():
    return scan_result


def get_abort_reason():
    return abort_reason


def abort_scan():
    global abort_reason
    abort_reason = "user"
    abort_event.set()
