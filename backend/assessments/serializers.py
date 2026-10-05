from rest_framework import serializers
from .models import Quiz, Question, Choice, Exercice


class ChoiceSerializer(serializers.ModelSerializer):
    class Meta:
        model = Choice
        fields = ["id", "texte", "est_correcte"]


class QuestionSerializer(serializers.ModelSerializer):
    choix = ChoiceSerializer(many=True, required=False)

    class Meta:
        model = Question
        fields = ["id", "enonce", "ordre", "choix"]

    def create(self, validated_data):
        choix_data = validated_data.pop("choix", [])
        question = Question.objects.create(**validated_data)
        for choice in choix_data:
            Choice.objects.create(question=question, **choice)
        return question


class QuizSerializer(serializers.ModelSerializer):
    questions = QuestionSerializer(many=True, read_only=True)

    class Meta:
        model = Quiz
        fields = ["id", "lecon", "module", "titre", "seuil_reussite", "questions"]
        read_only_fields = ["lecon", "module"]


class ExerciceSerializer(serializers.ModelSerializer):
    class Meta:
        model = Exercice
        fields = ["id", "lecon", "enonce", "correction"]
        read_only_fields = ["lecon"]


# ============================================================
# Version "publique" du quiz — jamais `est_correcte` : servie à l'apprenant
# AVANT qu'il réponde (via FormationContenuView), la bonne réponse ne doit
# jamais transiter dans ce JSON, sous peine d'être lisible dans l'onglet
# Réseau du navigateur et de vider le QCM de tout intérêt. La correction
# n'est révélée qu'après coup, par QuizSubmitView, une fois la réponse de
# l'apprenant déjà enregistrée.
# ============================================================


class ChoicePublicSerializer(serializers.ModelSerializer):
    class Meta:
        model = Choice
        fields = ["id", "texte"]


class QuestionPublicSerializer(serializers.ModelSerializer):
    choix = ChoicePublicSerializer(many=True, read_only=True)

    class Meta:
        model = Question
        fields = ["id", "enonce", "ordre", "choix"]


class QuizPublicSerializer(serializers.ModelSerializer):
    questions = QuestionPublicSerializer(many=True, read_only=True)

    class Meta:
        model = Quiz
        fields = ["id", "titre", "seuil_reussite", "questions"]
