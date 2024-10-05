from django.shortcuts import render

# index html view
def index(request):
    return render(request, 'planets/index.html')

def about(request):
    return render(request, 'planets/about.html')

def contact(request):
    return render(request, 'planets/contact.html')