from django.shortcuts import render
import csv
from django.http import HttpResponse
from .models import Idea


def download_idea_csv(request, idea_id):
    idea = Idea.objects.get(pk=idea_id)

    response = HttpResponse(content_type='text/csv')
    response['Content-Disposition'] = f'attachment; filename="idea_{idea_id}.csv"'

    writer = csv.writer(response)

    writer.writerow([
        'Idea ID',
        'Title',
        'Content',
        'Anonymous',
        'Submit Date',
        'User',
        'Department',
        'Closure Period',
        'Terms Accepted'
    ])

    writer.writerow([
        idea.idea_id,
        idea.idea_title,
        idea.idea_content,
        idea.anonymous_status,
        idea.submit_datetime,
        idea.user.username if not idea.anonymous_status else "Anonymous",
        idea.department.name,
        idea.closurePeriod.id,
        idea.terms_accepted
    ])

    return response