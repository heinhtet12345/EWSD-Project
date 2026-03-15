from django.shortcuts import render
import zipfile
import os
from django.http import HttpResponse
from .models import Idea


def download_idea_documents_zip(request, idea_id):
    idea = Idea.objects.get(pk=idea_id)

    response = HttpResponse(content_type='application/zip')
    response['Content-Disposition'] = f'attachment; filename="idea_{idea_id}_documents.zip"'

    zip_file = zipfile.ZipFile(response, 'w')

    for doc in idea.documents.all():
        if doc.file:
            file_path = doc.file.path
            zip_file.write(file_path, os.path.basename(file_path))

    zip_file.close()

    return response