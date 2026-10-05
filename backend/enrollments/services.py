"""Logique métier du déverrouillage séquentiel des modules/leçons — même
règle que côté frontend (FormationDetailPage), mais ici c'est la seule
version qui compte : elle décide ce que le serveur sert réellement, pas
seulement ce qui s'affiche. Une leçon est déverrouillée si c'est la première
de son module ET que ce module est déverrouillé, ou si la leçon précédente
du même module est terminée. Un module est déverrouillé si c'est le premier,
ou si toutes les leçons du module précédent sont terminées."""

from trainings.models import Lecon

from .models import Inscription, Progression


def get_locked_lecon_ids(formation, inscription):
    """Renvoie l'ensemble des ids de leçons que `inscription` n'a pas encore
    le droit de consulter, pour servir un contenu tronqué côté API (vidéo,
    supports, corrections jamais renvoyés pour une leçon verrouillée)."""

    completed_lecon_ids = set(
        Progression.objects.filter(
            inscription=inscription, statut=Progression.Statut.TERMINEE
        ).values_list("lecon_id", flat=True)
    )

    locked_ids = set()
    module_unlocked = True

    for module in formation.modules.all():
        lecons = list(module.lecons.all())

        if not module_unlocked:
            locked_ids.update(lecon.id for lecon in lecons)
            module_unlocked = bool(lecons) and all(lecon.id in completed_lecon_ids for lecon in lecons)
            continue

        lesson_unlocked = True
        for lecon in lecons:
            if not lesson_unlocked:
                locked_ids.add(lecon.id)
            lesson_unlocked = lecon.id in completed_lecon_ids

        module_unlocked = bool(lecons) and all(lecon.id in completed_lecon_ids for lecon in lecons)

    return locked_ids


def marquer_inscription_terminee_si_complete(inscription, formation):
    """Factorisé entre ProgressionUpdateView (vidéo) et QuizSubmitView
    (QCM) : les deux font progresser une leçon par des voies différentes,
    mais la règle qui en découle — la formation entière est "Terminée" une
    fois TOUTES ses leçons validées — est unique, pas dupliquée deux fois
    avec le risque qu'elles divergent."""

    total_lecons = Lecon.objects.filter(module__formation=formation).count()
    completed_count = Progression.objects.filter(
        inscription=inscription, statut=Progression.Statut.TERMINEE
    ).count()

    if total_lecons > 0 and completed_count == total_lecons:
        inscription.statut = Inscription.Statut.TERMINEE
        inscription.save()
