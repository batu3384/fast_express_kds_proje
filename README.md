# 📈 Decision Support System (DSS)

![Node.js](https://img.shields.io/badge/Node.js-14.x-green) ![Python](https://img.shields.io/badge/Python-3.9-blue) ![Flask](https://img.shields.io/badge/Flask-2.x-black) ![MySQL](https://img.shields.io/badge/Database-MySQL-4479A1)

A robust, data-driven **Decision Support System** designed for business intelligence. This platform analyzes economic data (inflation, cost indices) to generate accurate future projections using machine learning.

## 🌟 Features

- **🔮 Forecasting Engine:** Utilizes **Linear Regression** algorithms to predict future costs based on inflation trends.
- **🏗️ Hybrid Architecture:** Seamlessly integrates a **Node.js (Express)** backend for application logic with a **Python (Flask)** microservice for data science operations.
- **🔄 Automated Data Pipeline:** Uses `node-cron` for scheduled data fetching and database updates.
- **🔒 Enterprise Security:** Implements Bcrypt for robust password hashing and secure session management.
- **📊 Interactive Dashboard:** Visualizes predictions and historical data for informed decision-making.

## 🏗️ System Architecture

The system operates on a dual-backend architecture:
1. **Node.js Server:** Handles HTTP requests, user authentication, and database interactions.
2. **Python Flask Service:** Dedicated to ML calculations and forecasting, communicating with Node.js via internal APIs.

## 🛠️ Tech Stack

| Domain | Tools |
|--------|-------|
| **Backend (Core)** | Node.js, Express.js |
| **Backend (AI)** | Python, Flask, Scikit-Learn |
| **Database** | MySQL |
| **Security** | Bcrypt, Express-Session |
| **DevOps** | Node-Cron (Scheduling) |

## 🚀 Installation & Setup

1. **Clone the Repo**
   ```bash
   git clone https://github.com/batu3384/decision-support-system.git
   cd decision-support-system
   ```

2. **Setup Node.js Backend**
   ```bash
   npm install
   ```

3. **Setup Python Service**
   ```bash
   pip install flask scikit-learn pandas mysql-connector-python
   ```

4. **Database Configuration**
   - Import the provided SQL schema (if available) into your MySQL instance.
   - Configure connection strings in `app.js` and `app.py`.

5. **Run the System**
   ```bash
   # Start Node.js server
   npm start
   
   # Start Python Flask service (in a separate terminal)
   python app.py
   ```

## 📄 License
MIT License
