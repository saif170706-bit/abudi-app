# **App Name**: Ibn Amer

## Core Features:

- User Authentication: Implement email/password authentication using Firebase Authentication with gated signup process, terms of service agreement, forgot password functionality, and role-based Firestore user profile creation.
- Admin Dashboard: Enable admins to view, add, and delete authorized users, managing their roles and subscription amounts (defaulting to 400, adjustable to 0) via a dedicated dashboard.
- Teacher Availability & Queue Management: Allow teachers to set their availability (physical or virtual), manage their student queue in real-time, and call the next student.
- Assignment & Grading: Enable teachers to manage assignments using a detailed pop-up dialog with searchable dropdowns, input grades (Perfekt, Meget godt, Godt, Ikke læst), and create new assignments within a Queue Assignment Manager accessible from both the queue flow and 'Find Student' feature.
- Student Queue Joining: Enable students to view available teachers, join queues (verifying location within a 150-meter radius using Geolocation API for physical queues - lat: 55.71671948579918, lon: 12.435200438173235), and track their position in the queue.
- Assignment Viewing: Allow students to view their upcoming and previously graded assignments with Hifz and Murajara grades.
- Personalized Learning Tool: Generative AI powered assignment selector to assist teachers in creating tailored homework assignments for the student by identifying potential tools which support them to achieve specific outcomes based on student performance. These might range from multimedia presentations of key concepts or summaries that condense learning materials into bullet-point notes to multiple choice questions designed specifically to address the student's learning gaps. This is a reasoning tool.
- Robust Push Notifications: Implement a single, non-duplicating push notification system using Firebase Cloud Messaging with customized messages: '{Teacher Name} venter på dig i lokale {Room Number}.' for physical queues and 'Du bliver ringet op om et øjeblik. Vær klar...' for virtual queues. Ensure notifications work in the foreground and background.
- Comprehensive User Settings & Profile Management: Enable users to upload profile pictures (displaying initials-based avatars as a fallback), change their full name and phone number, update their password (requiring current password verification), securely delete their account (requiring password re-entry and confirmation), and view their subscription amount on the profile/membership page.
- Avatars: User-uploaded profile pictures must be displayed consistently throughout the app: in the main navbar, on student cards in the teacher's queue, and on teacher cards in the student's queue list. A default, initials-based avatar must be shown as a fallback if no photo is uploaded.

## Style Guidelines:

- Primary color: Deep blue (#3F51B5). This color was chosen for its association with institutions of learning, conveying trust and reliability.
- Background color: Light gray (#F5F5F5), creating a clean and neutral backdrop.
- Accent color: Teal (#009688) for interactive elements and highlights. Teal, an analogous color to blue, provides a fresh and engaging feel while maintaining visual harmony.
- Body font: 'Inter' (sans-serif) for a modern, neutral, and readable text.
- Headline font: 'Space Grotesk' (sans-serif) to complement Inter, offering a computerized, techy feel for titles.
- Use the lucide-react icon library.
- Responsive, grid-based layout optimized for both mobile and desktop. Centered content area with a maximum width for readability. Persistent top navbar with app logo, name, and user avatar dropdown menu.
- Subtle transitions and animations for UI elements (buttons, cards, dialogs) to enhance user experience.