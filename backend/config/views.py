from django.http import JsonResponse
from django.views.generic import TemplateView
from django.conf import settings


from django.http import HttpResponse

def favicon_view(request):
    return HttpResponse(status=204)


def health_check(request):
    """Health check endpoint"""
    return JsonResponse({"status": "ok", "service": "Connectify API", "version": "1.0.0"})


class HomeView(TemplateView):
    """Home page view"""
    template_name = 'home.html'
    
    def get_context_data(self, **kwargs):
        context = super().get_context_data(**kwargs)
        context['api_routes'] = {
            'API Health Check': '/api/health/',
            'API Documentation': '/api/docs/',  # Will be added if you use DRF Spectacular or similar
            'Admin Panel': '/admin/',
            'Authentication': {
                'Obtain Token': '/api/token/',
                'Refresh Token': '/api/token/refresh/',
                'Verify Token': '/api/token/verify/',
            },
            'User Accounts': {
                'Register': '/api/accounts/register/',
                'User Profile': '/api/accounts/profile/',
            },
        }
        return context
