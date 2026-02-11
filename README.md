# EcoClassifier – AI-Powered Smart Waste Management System

EcoClassifier is an AI-powered smart waste classification and analytics system.  
It combines a **smart bin**, **computer vision model**, and a **web-based dashboard** to:

- Automatically detect and classify waste (e.g. plastic bottles, plastic cups, paper)
- Log and analyze disposal patterns in real-time
- Support better waste sorting, recycling, and sustainability decisions

This project is part of an academic prototype at **Uganda Christian University (UCU)** and aligns with  
**SDG 6 – Clean Water and Sanitation** and **SDG 13 – Climate Action**.

---

## 🚀 Features

- 🗑️ **Smart Bin Integration**
  - Sensors detect when waste is dropped into the bin
  - Camera captures an image of the waste for classification
  - Mechanical sorting directs waste into the correct compartment

- 🤖 **AI-Based Waste Classification**
  - Model trained on a **custom dataset** of:
    - Plastic bottles
    - Plastic cups
    - Book paper
    - Napkins and related paper materials
  - Dataset collected on the UCU campus and labelled using **Label Studio**

- 📊 **Real-Time Web Dashboard**
  - Built with a modern JavaScript stack
  - Displays:
    - Total waste collected
    - Waste by category (plastic, paper, etc.)
    - Trends and usage statistics over time

- 🌐 **API-Driven Architecture**
  - Backend exposes endpoints for:
    - Receiving waste events from the smart bin
    - Storing and querying waste records
    - Powering the analytics dashboard

- 🌱 **Sustainability Focus**
  - Reduces manual sorting work for garbage collectors
  - Minimizes poorly sorted rubbish reaching landfills
  - Encourages proper waste sorting at the source

---

## 🧱 Tech Stack

**Frontend**
- React (SPA dashboard)
- Tailwind CSS (styling)
- JavaScript

**Backend**
- Node.js
- Express.js
- MongoDB (data storage)

**AI / Data**
- Custom campus-specific waste dataset
- Label Studio (annotation tool)
- Jupyter Notebook (`model.ipynb`) for experimentation and model training



## 📁 Repository Structure

```bash
EcoClassifier/
├── backend/          # Node/Express backend (API, database integration)
├── frontend/         # React frontend for the dashboard
├── model.ipynb       # Jupyter notebook for model training

