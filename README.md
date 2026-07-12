<div align="center">

# 🤖 WhatsApp AI Assistant

### Intelligent Customer Support • Multi-Business Ready • Production Ready

<img src="https://readme-typing-svg.herokuapp.com?font=JetBrains+Mono&weight=600&size=24&duration=2500&pause=800&color=00F7FF&center=true&vCenter=true&width=900&lines=Meta+WhatsApp+Cloud+API;AI+Customer+Support+Platform;Memory+Powered+Conversations;Built+for+Real+Businesses;Scalable+Production+Architecture"/>

<br>

<img src="https://img.shields.io/badge/Status-Production%20Ready-00C853?style=flat-square"/>
<img src="https://img.shields.io/badge/Node.js-20+-339933?style=flat-square&logo=node.js"/>
<img src="https://img.shields.io/badge/TypeScript-Strict-3178C6?style=flat-square&logo=typescript"/>
<img src="https://img.shields.io/badge/Meta-WhatsApp%20Cloud-25D366?style=flat-square&logo=whatsapp"/>
<img src="https://img.shields.io/badge/OpenRouter-LLM-blueviolet?style=flat-square"/>

</div>

---

# 🚀 Overview

This project is a **production-ready AI-powered WhatsApp automation platform** built directly on the **Meta WhatsApp Cloud API**.

Unlike traditional chatbot solutions, this system focuses on creating **human-like conversations**, maintaining **conversation memory**, supporting **multiple businesses**, and providing seamless AI-powered customer interactions.

Whether it's answering product questions, handling customer inquiries, recognizing returning users, or escalating conversations to human staff, everything happens automatically.

---

# ⚡ Core Capabilities

```
📱 Customer Message
          │
          ▼
 Meta WhatsApp Cloud API
          │
          ▼
Webhook Verification
          │
          ▼
 Conversation Queue
          │
          ▼
 AI Processing
          │
          ▼
 Memory + Business Context
          │
          ▼
 Smart Response
          │
          ▼
 WhatsApp Reply
```

---

# ✨ Features

### 💬 Intelligent Conversations

* Natural language conversations
* Context-aware replies
* Memory across messages
* Personalized responses

---

### 🧠 AI Engine

* Claude
* GPT
* Gemini
* DeepSeek
* Any OpenRouter model

Switch models by changing **one environment variable**.

---

### 🏢 Multi Business Support

One application can serve multiple businesses.

Each business has:

* Separate knowledge base
* Separate prompts
* Separate customers
* Separate conversations

---

### 📷 Media Support

✔ Images

✔ Vision Models

✔ Documents

✔ Audio

✔ Video Detection

---

### 🔄 Automatic Escalation

If AI cannot answer:

```
Customer
    │
    ▼
AI Confidence Check
    │
    ▼
Needs Human?
    │
 ┌──┴─────┐
 │ Yes    │
 ▼        ▼
Notify   AI Reply
Admin
```

---

# 🏗 Architecture

```mermaid
graph TD

A(Customer)

B(Meta Cloud API)

C(Webhook)

D(BullMQ)

E(AI Engine)

F(OpenRouter)

G(PostgreSQL)

H(Redis)

I(WhatsApp Reply)

A --> B

B --> C

C --> D

D --> E

E --> F

E --> G

E --> H

F --> I
```

---

# ⚙ Technology

| Layer      | Technology |
| ---------- | ---------- |
| Frontend   | React      |
| Backend    | Node.js    |
| Runtime    | TypeScript |
| Framework  | Fastify    |
| Database   | PostgreSQL |
| Queue      | BullMQ     |
| Cache      | Redis      |
| AI         | OpenRouter |
| Deployment | Docker     |

---

# 📁 Project Structure

```text
src/

├── modules/
│      ├── whatsapp/
│      ├── llm/
│      ├── conversation/
│      ├── customers/
│      └── workers/
│
├── queues/
├── prisma/
├── config/
├── tests/
│
└── server.ts
```

---

# 🚀 Quick Start

Clone

```bash
git clone https://github.com/tejureddy157/whatsapp-ai-agent.git
```

Install

```bash
npm install
```

Run Server

```bash
npm run dev:server
```

Run Worker

```bash
npm run dev:worker
```

---

# 🧩 AI Workflow

```text
Customer Message

      │

      ▼

Webhook Verification

      │

      ▼

Conversation Memory

      │

      ▼

Business Knowledge

      │

      ▼

LLM Processing

      │

      ▼

Safety Check

      │

      ▼

WhatsApp Response
```

---

# 📊 GitHub Dashboard

<p align="center">

<img width="48%" src="https://github-readme-stats.vercel.app/api?username=tejureddy157&show_icons=true&theme=tokyonight&hide_border=true"/>

<img width="48%" src="https://github-readme-streak-stats.herokuapp.com/?user=tejureddy157&theme=tokyonight&hide_border=true"/>

</p>

---

# 📈 Contribution Graph

<p align="center">

<img src="https://github-readme-activity-graph.vercel.app/graph?username=tejureddy157&theme=tokyo-night&hide_border=true"/>

</p>

---

# 🎯 Roadmap

* ✅ Meta Cloud API
* ✅ Conversation Memory
* ✅ AI Replies
* ✅ Multi Business Support
* ✅ Human Escalation
* ⏳ CRM Integration
* ⏳ Admin Dashboard
* ⏳ RAG Knowledge Base
* ⏳ Analytics
* ⏳ Voice Assistant

---

# 🌍 Connect

<p align="center">

<a href="https://github.com/tejureddy157">
<img src="https://img.shields.io/badge/GitHub-181717?style=for-the-badge&logo=github"/>
</a>

<a href="https://linkedin.com">
<img src="https://img.shields.io/badge/LinkedIn-0077B5?style=for-the-badge&logo=linkedin"/>
</a>

</p>

---

<div align="center">

## ⚡ Built for Modern Businesses

**Automate Conversations • Delight Customers • Scale Support**

⭐ **If this project helped you, consider giving it a star!**

</div>
