# backend\app\email.py#

from email.message import EmailMessage
import smtplib

def sende_testbenachrichtigung(empfaenger_email: str, benutzername: str):
    """
    Versendet eine Benachrichtigungsmail an den Benutzer, wenn der Test abgeschlossen ist.

    :param empfaenger_email: Zieladresse des Benutzers
    :param benutzername: Name des Benutzers für die persönliche Ansprache
    """

    nachricht = EmailMessage()
    nachricht['From'] = 'barifree.testbericht@gmail.com'
    nachricht['To'] = empfaenger_email
    nachricht['Subject'] = 'Dein Test ist abgeschlossen!'

    nachricht.set_content(f'''
Hallo {benutzername or empfaenger_email},

dein Test bei BariFree wurde erfolgreich abgeschlossen und steht zum Download bereit.
Du kannst die Ergebnisse jederzeit über die BariFree-Webanwendung abrufen.

Viele Grüße
Dein BariFree Team von ASQA


--------
BariFree ist ein Projekt, das von ASQA entwickelt wurde.
Bitte beachte, dass diese E-Mail automatisch generiert wurde. Antworten auf diese E-Mail werden nicht gelesen.
--------
''')

    try:
        with smtplib.SMTP_SSL('smtp.gmail.com', 465) as server:
            server.login('barifree.testbericht@gmail.com', 'nafo mswa icnc idgn')
            server.send_message(nachricht)

        print(f"E-Mail erfolgreich an {empfaenger_email} gesendet.")
    except Exception as e:
        print(f"Fehler beim Senden der E-Mail: {e}")
