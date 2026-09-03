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
from django.contrib import admin
from django.urls import include, path

urlpatterns = [
    path('admin/', admin.site.urls),
    path('api/', include('accounts.urls')),
    path('api/', include('core.urls')),
    path('api/', include('trainings.urls')),
    path('api/', include('assessments.urls')),
    path('api/', include('enrollments.urls')),
    path('api/', include('certifications.urls')),
    path('api/', include('assistant.urls')),
    path('api/', include('playground.urls')),
    path('api/', include('sheets.urls')),
    path('api/', include('notes.urls')),
    path('api/', include('boards.urls')),
    path('api/', include('modeling.urls')),
]
