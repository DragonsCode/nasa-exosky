from django.shortcuts import render

# index html view
def index(request):
    return render(request, 'planets/index.html')