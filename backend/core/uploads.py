"""Validation du contenu réel des fichiers déposés par les utilisateurs
(vidéos de leçon, supports de leçon, documents de bibliothèque) — en plus
de l'extension déclarée dans le nom du fichier, qui peut mentir : un
attaquant peut renommer n'importe quel fichier en .pdf/.jpg/... pour
contourner un contrôle qui ne regarde que le nom (cf. audit sécurité).

Aucune dépendance externe volontairement (pas de libmagic système, non
garanti disponible partout) : une poignée de signatures suffit pour les
formats réellement acceptés par l'app."""

import os


def extension_de(nom_fichier):
    return os.path.splitext(nom_fichier or "")[1].lower()


def valider_signature_fichier(fichier, extension):
    """Vérifie que le CONTENU réel du fichier (ses premiers octets, sa
    "signature magique") correspond à l'extension déclarée — renvoie False
    si le fichier n'est manifestement pas ce qu'il prétend être. Repositionne
    toujours le curseur du fichier à 0 avant de retourner, pour que la
    lecture/sauvegarde qui suit (default_storage.save, serializer.save...)
    reparte bien du début du fichier."""

    extension = (extension or "").lower()
    try:
        fichier.seek(0)
        entete = fichier.read(16)
    finally:
        fichier.seek(0)

    if extension in (".mp4", ".mov"):
        # Conteneur ISO-BMFF : la signature n'est pas au tout début du
        # fichier mais juste après les 4 octets de taille de la 1re "box".
        return entete[4:8] in (b"ftyp", b"moov", b"free", b"mdat", b"wide", b"skip")
    if extension == ".webm":
        return entete.startswith(b"\x1a\x45\xdf\xa3")
    if extension == ".ogg":
        return entete.startswith(b"OggS")
    if extension == ".pdf":
        return entete.startswith(b"%PDF-")
    if extension in (".doc", ".ppt"):
        # Format binaire OLE2, commun aux anciens .doc/.ppt.
        return entete.startswith(b"\xd0\xcf\x11\xe0\xa1\xb1\x1a\xe1")
    if extension in (".docx", ".pptx", ".epub"):
        # OOXML/EPUB : une archive ZIP standard.
        return entete[:2] == b"PK"
    if extension == ".png":
        return entete.startswith(b"\x89PNG\r\n\x1a\n")
    if extension in (".jpg", ".jpeg"):
        return entete.startswith(b"\xff\xd8\xff")

    return True  # extension non couverte par cette liste : pas de vérification de contenu ici
