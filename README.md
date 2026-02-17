# Decision Support System

A data-driven decision support system for businesses. Analyzes inflation and cost data to generate future projections and forecasts.

## Features

- **Forecasting Engine:** Linear Regression-based inflation-adjusted cost prediction
- **Hybrid Architecture:** Node.js (Express) + Python (Flask) dual-backend setup
- **Automation:** Scheduled data updates and reports via node-cron
- **Security:** Bcrypt encryption and session management
- **MySQL Database:** Comprehensive data management

## Tech Stack

| Category | Technology |
|----------|-----------|
| Backend | Node.js, Express, Python, Flask |
| Machine Learning | scikit-learn, ml-regression |
| Database | MySQL |
| Security | bcrypt, express-session |
| Automation | node-cron |

## Project Structure

```
decision-support-system/
├── app.js           # Node.js main server
├── app.py           # Python Flask prediction service
├── data-seeder.js   # Database seed script
└── package.json     # Node.js dependencies
```

## Getting Started

```bash
git clone https://github.com/batu3384/decision-support-system.git
cd decision-support-system
npm install
pip install flask scikit-learn
npm start
```

## License

MIT License
