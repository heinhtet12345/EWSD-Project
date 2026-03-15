from django.core.management.base import BaseCommand
from django.contrib.auth import get_user_model
from api.models import Department, Role, Category

User = get_user_model()

class Command(BaseCommand):
    help = "Seed database with departments, users, and categories"

    def handle(self, *args, **kwargs):
        # Create Departments
        departments_data = [
            {'name': 'Computer Science'},
            {'name': 'Business Administration'},
            {'name': 'Engineering'},
            {'name': 'Health Sciences'},
            {'name': 'Arts and Humanities'},
        ]
        
        dept_objects = {}
        for i, dept_data in enumerate(departments_data, 1):
            dept, created = Department.objects.get_or_create(
                dept_name=dept_data['name']
            )
            dept_objects[i] = dept
            if created:
                self.stdout.write(f"Created Department: {dept.dept_name}")

        # Create Roles
        roles = ['admin', 'qa_manager', 'qa_coordinator', 'staff']
        role_objects = {}
        for role_name in roles:
            role, created = Role.objects.get_or_create(role_name=role_name.title().replace('_', ' '))
            role_objects[role_name] = role
            if created:
                self.stdout.write(f"Created Role: {role.role_name}")

        # Create Users
        users_data = [
            {'username': 'admin', 'email': 'admin@university.edu', 'role': 'admin', 'department_id': None},
            {'username': 'qa_manager', 'email': 'qa.manager@university.edu', 'role': 'qa_manager', 'department_id': None},
            {'username': 'cs_qa', 'email': 'cs.qa@university.edu', 'role': 'qa_coordinator', 'department_id': 1},
            {'username': 'business_qa', 'email': 'business.qa@university.edu', 'role': 'qa_coordinator', 'department_id': 2},
            {'username': 'eng_qa', 'email': 'eng.qa@university.edu', 'role': 'qa_coordinator', 'department_id': 3},
            {'username': 'health_qa', 'email': 'health.qa@university.edu', 'role': 'qa_coordinator', 'department_id': 4},
            {'username': 'arts_qa', 'email': 'arts.qa@university.edu', 'role': 'qa_coordinator', 'department_id': 5},
            {'username': 'alice_cs', 'email': 'alice.cs@uni.edu', 'role': 'staff', 'department_id': 1},
            {'username': 'brian_cs', 'email': 'brian.cs@uni.edu', 'role': 'staff', 'department_id': 1},
            {'username': 'cindy_cs', 'email': 'cindy.cs@uni.edu', 'role': 'staff', 'department_id': 1},
            {'username': 'david_cs', 'email': 'david.cs@uni.edu', 'role': 'staff', 'department_id': 1},
            {'username': 'eric_cs', 'email': 'eric.cs@uni.edu', 'role': 'staff', 'department_id': 1},
            {'username': 'fiona_bus', 'email': 'fiona.bus@uni.edu', 'role': 'staff', 'department_id': 2},
            {'username': 'george_bus', 'email': 'george.bus@uni.edu', 'role': 'staff', 'department_id': 2},
            {'username': 'hannah_bus', 'email': 'hannah.bus@uni.edu', 'role': 'staff', 'department_id': 2},
            {'username': 'ian_bus', 'email': 'ian.bus@uni.edu', 'role': 'staff', 'department_id': 2},
            {'username': 'jack_bus', 'email': 'jack.bus@uni.edu', 'role': 'staff', 'department_id': 2},
            {'username': 'kevin_eng', 'email': 'kevin.eng@uni.edu', 'role': 'staff', 'department_id': 3},
            {'username': 'laura_eng', 'email': 'laura.eng@uni.edu', 'role': 'staff', 'department_id': 3},
            {'username': 'michael_eng', 'email': 'michael.eng@uni.edu', 'role': 'staff', 'department_id': 3},
            {'username': 'nina_eng', 'email': 'nina.eng@uni.edu', 'role': 'staff', 'department_id': 3},
            {'username': 'oscar_eng', 'email': 'oscar.eng@uni.edu', 'role': 'staff', 'department_id': 3},
            {'username': 'paula_health', 'email': 'paula.health@uni.edu', 'role': 'staff', 'department_id': 4},
            {'username': 'quentin_health', 'email': 'quentin.health@uni.edu', 'role': 'staff', 'department_id': 4},
            {'username': 'rachel_health', 'email': 'rachel.health@uni.edu', 'role': 'staff', 'department_id': 4},
            {'username': 'steven_health', 'email': 'steven.health@uni.edu', 'role': 'staff', 'department_id': 4},
            {'username': 'tina_health', 'email': 'tina.health@uni.edu', 'role': 'staff', 'department_id': 4},
            {'username': 'uma_arts', 'email': 'uma.arts@uni.edu', 'role': 'staff', 'department_id': 5},
            {'username': 'victor_arts', 'email': 'victor.arts@uni.edu', 'role': 'staff', 'department_id': 5},
            {'username': 'wendy_arts', 'email': 'wendy.arts@uni.edu', 'role': 'staff', 'department_id': 5},
            {'username': 'xavier_arts', 'email': 'xavier.arts@uni.edu', 'role': 'staff', 'department_id': 5},
            {'username': 'yara_arts', 'email': 'yara.arts@uni.edu', 'role': 'staff', 'department_id': 5},
        ]

        for user_data in users_data:
            if not User.objects.filter(username=user_data['username']).exists():
                user = User.objects.create_user(
                    username=user_data['username'],
                    email=user_data['email'],
                    password='pass123',  
                    role=role_objects[user_data['role']],
                    department=dept_objects[user_data['department_id']] if user_data['department_id'] else None,
                )
                self.stdout.write(f"Created User: {user.username}")

        # Create Categories
        categories_data = [
            {'name': 'Teaching Quality', 'desc': 'Quality of teaching and instruction'},
            {'name': 'Course Content', 'desc': 'Content and structure of courses'},
            {'name': 'Assessment Methods', 'desc': 'Methods used for student assessment'},
            {'name': 'Student Support', 'desc': 'Support services for students'},
            {'name': 'Online Learning', 'desc': 'Online and digital learning resources'},
            {'name': 'Classroom Facilities', 'desc': 'Physical classroom and facilities'},
            {'name': 'Library Resources', 'desc': 'Library and research resources'},
            {'name': 'IT Infrastructure', 'desc': 'Information technology infrastructure'},
            {'name': 'Research Support', 'desc': 'Support for research activities'},
            {'name': 'Administrative Processes', 'desc': 'Administrative and bureaucratic processes'},
            {'name': 'Communication', 'desc': 'Communication within the institution'},
            {'name': 'Campus Safety', 'desc': 'Safety and security on campus'},
            {'name': 'Environmental Sustainability', 'desc': 'Environmental and sustainability efforts'},
            {'name': 'Accessibility', 'desc': 'Accessibility for all users'},
            {'name': 'Student Engagement', 'desc': 'Engagement and involvement of students'},
            {'name': 'Internship Programs', 'desc': 'Programs for internships and work experience'},
            {'name': 'Industry Collaboration', 'desc': 'Collaboration with industry partners'},
            {'name': 'Academic Advising', 'desc': 'Academic advising and guidance'},
            {'name': 'Staff Training', 'desc': 'Training and development for staff'},
            {'name': 'Workload Management', 'desc': 'Management of workload and stress'},
            {'name': 'Timetable Scheduling', 'desc': 'Scheduling of classes and timetables'},
            {'name': 'Course Registration', 'desc': 'Process for registering for courses'},
            {'name': 'Digital Tools', 'desc': 'Digital tools and software used'},
            {'name': 'Data Management', 'desc': 'Management of data and information'},
            {'name': 'Innovation Programs', 'desc': 'Programs promoting innovation'},
            {'name': 'Quality Assurance', 'desc': 'Assurance of quality in processes'},
            {'name': 'Performance Evaluation', 'desc': 'Evaluation of performance'},
            {'name': 'Feedback Systems', 'desc': 'Systems for collecting feedback'},
            {'name': 'Student Wellbeing', 'desc': 'Wellbeing and mental health of students'},
            {'name': 'Mental Health Support', 'desc': 'Support for mental health'},
            {'name': 'Campus Transport', 'desc': 'Transportation services on campus'},
            {'name': 'Food Services', 'desc': 'Food and dining services'},
            {'name': 'Accommodation', 'desc': 'Housing and accommodation options'},
            {'name': 'International Programs', 'desc': 'Programs for international students'},
            {'name': 'Community Engagement', 'desc': 'Engagement with the local community'},
            {'name': 'Event Management', 'desc': 'Management of events and activities'},
            {'name': 'Learning Spaces', 'desc': 'Spaces designed for learning'},
            {'name': 'Career Services', 'desc': 'Services for career development'},
            {'name': 'Alumni Relations', 'desc': 'Relations with alumni'},
            {'name': 'Policy Improvement', 'desc': 'Improvement of institutional policies'},
        ]

        for cat_data in categories_data:
            category, created = Category.objects.get_or_create(
                category_name=cat_data['name'],
                defaults={'category_desc': cat_data['desc']}
            )
            if created:
                self.stdout.write(f"Created Category: {category.category_name}")

        self.stdout.write("Seeding completed!")