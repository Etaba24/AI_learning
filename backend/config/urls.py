"""
URL configuration for config project.

The `urlpatterns` list routes URLs to views. For more information please see:
    https://docs.djangoproject.com/en/6.1/topics/http/urls/
Examples:
Function views
    1. Add an import:  from my_app import views
    2. Add a URL to urlpatterns:  path('', views.home, name='home')
Class-based views
    1. Add an import:  from other_app.views import Home
    2. Add a URL to urlpatterns:  path('', Home.as_view(), name='home')
Including another URLconf
    1. Import the include() function: from django.urls import include, path
    2. Add a URL to urlpatterns:  path('blog/', include('blog.urls'))
"""
from django.conf import settings
from django.conf.urls.static import static
from django.contrib import admin
from django.urls import include, path

urlpatterns = [
    path(settings.ADMIN_URL_PATH, admin.site.urls),
    path('api/', include('accounts.urls')),
    path('api/', include('core.urls')),
    path('api/', include('trainings.urls')),
    path('api/', include('assessments.urls')),
    path('api/', include('enrollments.urls')),
    path('api/', include('assistant.urls')),
    path('api/', include('playground.urls')),
    path('api/', include('sheets.urls')),
    path('api/', include('notes.urls')),
    path('api/', include('boards.urls')),
    path('api/', include('modeling.urls')),
    path('api/', include('billing.urls')),
    path('api/', include('messaging.urls')),
    path('api/', include('library.urls')),
    path('api/', include('chemistry.urls')),
]

# Sert les fichiers déposés (PDF/EPUB) en développement — en production, un
# vrai serveur web/objet storage s'en charge, jamais Django lui-même.
if settings.DEBUG:
    urlpatterns += static(settings.MEDIA_URL, document_root=settings.MEDIA_ROOT)
