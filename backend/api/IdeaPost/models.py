from django.db import models
from django.conf import settings

class Idea(models.Model):
    idea_id = models.AutoField(primary_key=True)
    idea_title = models.CharField(max_length=50)
    idea_content = models.TextField() # Varchar(256) in ERD
    anonymous_status = models.BooleanField(default=False)
    submit_datetime = models.DateTimeField(auto_now_add=True)
    terms_accepted = models.BooleanField(default=False)
    
    user = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.CASCADE)
    department = models.ForeignKey('api.Department', on_delete=models.CASCADE)
    closurePeriod = models.ForeignKey('closure_period.ClosurePeriod', on_delete=models.CASCADE)
    
    categories = models.ManyToManyField('api.Category', related_name='ideas', db_table='Idea_Category')

    def __str__(self):
        return self.idea_title

class UploadedDocument(models.Model):
    doc_id = models.AutoField(primary_key=True)
    file = models.FileField(upload_to='idea_documents/')
    file_name = models.CharField(max_length=50)
    upload_time = models.DateTimeField(auto_now_add=True)
    idea = models.ForeignKey(Idea, on_delete=models.CASCADE, related_name='documents')
