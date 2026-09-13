"""Récupération de structures moléculaires réelles auprès de PubChem (base
publique du NIH américain, https://pubchem.ncbi.nlm.nih.gov) — jamais de
coordonnées 3D inventées : une molécule ne peut être affichée que si
PubChem en fournit réellement une structure, sinon l'appelant reçoit une
erreur claire plutôt qu'une forme fictive.

Aucune dépendance externe (urllib, comme le reste du projet pour les
appels à des API tierces — JDoodle, Google tokeninfo)."""

import json
import urllib.error
import urllib.parse
import urllib.request

PUBCHEM_BASE = "https://pubchem.ncbi.nlm.nih.gov/rest/pug"
TIMEOUT_SECONDES = 10


class MoleculeIntrouvable(Exception):
    """Aucune structure ne correspond à la recherche."""


def _requete(url):
    req = urllib.request.Request(url, headers={"User-Agent": "ai-learning-backend/1.0"})
    try:
        with urllib.request.urlopen(req, timeout=TIMEOUT_SECONDES) as resp:
            return resp.read().decode("utf-8")
    except urllib.error.HTTPError as exc:
        if exc.code == 404:
            raise MoleculeIntrouvable() from exc
        raise
    except (urllib.error.URLError, TimeoutError) as exc:
        raise ConnectionError("Impossible de contacter PubChem.") from exc


def _premier_cid_par_formule(formule):
    """La recherche par formule brute renvoie potentiellement plusieurs
    composés (une même formule peut correspondre à plusieurs molécules,
    ex: isomères) — on prend le premier CID renvoyé par PubChem, qui est en
    pratique presque toujours le composé le plus référencé/canonique."""
    url = f"{PUBCHEM_BASE}/compound/fastformula/{urllib.parse.quote(formule)}/cids/JSON"
    data = json.loads(_requete(url))
    cids = data.get("IdentifierList", {}).get("CID", [])
    if not cids:
        raise MoleculeIntrouvable()
    return cids[0]


def _sdf_par_cid(cid, dimension):
    url = f"{PUBCHEM_BASE}/compound/cid/{cid}/SDF?record_type={dimension}"
    return _requete(url)


def _sdf_par_nom(nom, dimension):
    url = f"{PUBCHEM_BASE}/compound/name/{urllib.parse.quote(nom)}/SDF?record_type={dimension}"
    return _requete(url)


def recuperer_sdf(recherche, mode):
    """`mode` vaut 'nom' ou 'formule'. Essaie d'abord une structure 3D (la
    plus utile pour un rendu ball-and-stick réaliste) ; à défaut, retombe
    sur la 2D plutôt que d'échouer complètement — toujours une vraie
    structure PubChem, jamais fabriquée localement."""
    for dimension in ("3d", "2d"):
        try:
            if mode == "formule":
                cid = _premier_cid_par_formule(recherche)
                return _sdf_par_cid(cid, dimension), dimension
            return _sdf_par_nom(recherche, dimension), dimension
        except MoleculeIntrouvable:
            continue
    raise MoleculeIntrouvable()


def parser_sdf_v2000(sdf_text):
    """Extrait atomes (élément + coordonnées) et liaisons du premier bloc
    MOL (format V2000) d'un fichier SDF. Parsing volontairement minimal
    (split() par ligne, pas de découpage par colonnes fixes) : suffisant
    et plus robuste pour ce qu'on en fait (juste le rendu 3D), pas besoin
    d'une dépendance lourde type RDKit pour ça."""
    lines = sdf_text.splitlines()
    if len(lines) < 4:
        raise ValueError("Fichier SDF invalide ou vide.")

    counts_line = lines[3]
    try:
        nb_atomes = int(counts_line[0:3])
        nb_liaisons = int(counts_line[3:6])
    except ValueError as exc:
        raise ValueError("Bloc MOL invalide (ligne de comptage illisible).") from exc

    atomes = []
    for i in range(nb_atomes):
        parts = lines[4 + i].split()
        x, y, z, element = float(parts[0]), float(parts[1]), float(parts[2]), parts[3]
        atomes.append({"element": element, "x": x, "y": y, "z": z})

    liaisons = []
    for i in range(nb_liaisons):
        parts = lines[4 + nb_atomes + i].split()
        a, b, ordre = int(parts[0]), int(parts[1]), int(parts[2])
        # PubChem numérote les atomes à partir de 1 ; on repasse à partir
        # de 0 pour correspondre directement aux index du tableau `atomes`.
        liaisons.append({"a": a - 1, "b": b - 1, "ordre": ordre})

    return atomes, liaisons
