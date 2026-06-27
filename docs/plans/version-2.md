# BUILD MARKETING MCP HUB

Bạn là Senior MCP Engineer.

Hãy xây dựng một MCP Server production-ready cho nền tảng Vitba.ai.

Mục tiêu:

Cho phép AI Agents có thể kết nối và điều khiển toàn bộ hệ sinh thái Marketing thông qua MCP Protocol.

---

# MCP SERVER REQUIREMENTS

Framework:

* Python 3.12+
* FastMCP
* FastAPI
* PostgreSQL
* Redis
* Docker

Yêu cầu:

* MCP Server chuẩn
* Tool Calling
* Async
* Production Ready
* Multi User
* Multi Tenant

---

# META MCP MODULE

Tạo module MetaMCP.

Sử dụng:

* Facebook Graph API
* Instagram Graph API
* Meta OAuth

Tools:

### connect_meta()

Kết nối tài khoản Meta.

---

### get_pages()

Trả về toàn bộ Fanpage user quản lý.

Output:

{
pages:[]
}

---

### create_post()

Input:

{
page_id:"",
content:"",
image_url:""
}

Đăng bài Facebook.

---

### bulk_post()

Input:

{
page_ids:[],
content:""
}

Đăng nhiều page.

---

### schedule_post()

Input:

{
page_id:"",
content:"",
publish_time:""
}

---

### get_comments()

Input:

{
post_id:""
}

---

### reply_comment()

Input:

{
comment_id:"",
message:""
}

---

### get_insights()

Input:

{
page_id:"",
range:"7d"
}

Output:

{
reach:0,
engagement:0,
followers:0
}

---

# EMAIL MCP MODULE

Provider:

* Resend
* Brevo
* SendGrid

Tools:

### send_email()

Input:

{
to:"",
subject:"",
html:""
}

---

### bulk_send()

Input:

{
segment:"",
subject:"",
html:""
}

---

### create_campaign()

Input:

{
campaign_name:"",
content:""
}

---

### get_campaign_stats()

Output:

{
sent:0,
opens:0,
clicks:0
}

---

# GITHUB MCP MODULE

Tools:

### create_repository()

### commit_code()

### push_code()

### create_release()

### get_repository_info()

---

# VERCEL MCP MODULE

Tools:

### create_project()

### deploy_project()

Input:

{
github_repo:""
}

Output:

{
deployment_url:""
}

---

### get_deployment_status()

---

### rollback_deployment()

---

# RAILWAY MCP MODULE

Tools:

### create_project()

### create_database()

### deploy_backend()

### restart_service()

### get_logs()

---

# LANDING PAGE MCP MODULE

Tools:

### generate_landing_page()

Input:

{
niche:"",
product:"",
target_customer:""
}

Output:

{
nextjs_code:"",
components:[]
}

---

### publish_landing_page()

Tự động deploy qua Vercel MCP.

---

# AUTHENTICATION

OAuth Support:

* Meta
* Google
* GitHub
* Vercel

Token Storage:

* PostgreSQL
* AES Encryption

---

# DATABASE

Tables:

users

oauth_accounts

meta_pages

campaigns

deployments

email_campaigns

audit_logs

---

# SECURITY

* JWT
* Rate Limit
* Audit Logs
* Token Encryption
* Role Based Access

---

# OUTPUT REQUIRED

Sinh đầy đủ:

1. MCP Architecture
2. Folder Structure
3. Database Schema
4. FastMCP Implementation
5. OAuth Flows
6. Meta Integration
7. Email Integration
8. GitHub Integration
9. Vercel Integration
10. Railway Integration
11. Docker Compose
12. Production Deployment Guide

Yêu cầu:

* Code hoàn chỉnh
* Chạy được ngay
* Có ví dụ tool calling
* Có ví dụ AI Agent gọi MCP tools
* Production-ready
* Dễ mở rộng thêm MCP modules mới
