# BoardShowdown

## Project Overview
**BoardShowdown** is a head-to-head, live, web-based app in which users solve quantitative/mathematical problems by collaboratively or competitively "whiteboarding" their solutions, having each user see the same mathematics problem (algebra, calculus, or finance‐based problem, for instance). Users write or draw out their step-by-step solution on the same digital canvas. Points are earned based on accuracy and speed; simultaneous connections mean users can compete one‐on‐one.

In order to add more learning depth, each stroke (typed or handwritten input) is recorded and translated to LaTeX. When a user completes a solution (or time runs out), our server employs an AI feedback engine (based on OpenAI’s API) to compare the LaTeX expression tree to the optimal solution. The engine provides specific feedback: “You reversed the sign on term x²” or “Good factoring, but verify your constant term.” The feature invites iteration towards learning as well as enabling users to see narrowly defined areas where they erred.

Later, **BoardShowdown** can be expanded outside of strictly quantitative mathematics to cover other STEM or logical questions, but for the case of Summer 2025, it will concentrate on one bank of 20–30 finance and quantitative mathematics questions (such as time‐value‐of‐money, probability, simple linear regression) taken from sample interview problems.

---

## Team Members

| Full Name             | Email                          | UtorID   |
| --------------------- | ------------------------------ | -------- |
| Arina Azmi            | arina.azmi@mail.utoronto.ca    | azmiarin |
| Ilya Kostin           | ilya.kostin@mail.utoronto.ca   | kostinil |
| Ashwin Mayurathan     | ash.mayurathan@mail.utoronto.ca| mayurat1 |

---

## Tech Stack

- **Database**: PostgreSQL + REST API  
- **Backend**: Express.js  
- **Frontend**: Angular, Tailwind CSS  

---

## Additional Requirements

- **Docker**: Containerization and deployment  
- **Stripe**: Subscription and payment handling  

---

## Milestones

### Alpha Version
- Log In / Sign In  
- Basic Single-Page Application (SPA) whiteboard features  
- Questions Bank CRUD (Create, Read, Update, Delete)  

### Beta Version
- Conversion of hand-drawn/typed notes into LaTeX (Notes → LaTeX)  
- AI-powered feedback on submitted solutions  
- Real-time sharing of the whiteboard between competing users  

### Final Version
- Subscription / Payment Management with Stripe  
- Question Leaderboard (Rankings for users and individual questions)  
- Deployment via Docker container  

---

## How to Get Started

1. **Clone the repository**  
   ```bash
   git clone https://github.com/your-org/BoardShowdown.git
   cd BoardShowdown
