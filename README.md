# RivannaAI

> AI-Powered HPC Cluster Resource Monitoring & Job Optimization Platform

RivannaAI is an intelligent web application that revolutionizes how researchers interact with High-Performance Computing (HPC) clusters. By combining real-time resource monitoring with machine learning-powered predictions and conversational AI assistance, RivannaAI helps users make smarter decisions about their computational workloads.

## 🎯 The Problem

HPC cluster users face several challenges:
- **Resource visibility**: Difficulty monitoring GPU availability across different partitions
- **Queue uncertainty**: No clear estimate of job wait times
- **Configuration complexity**: Choosing optimal SLURM parameters for jobs
- **Inefficient resource allocation**: Jobs often request more resources than needed

## 💡 Our Solution

RivannaAI provides a unified platform that:
1. **Monitors cluster resources** in real-time across all GPU types and partitions
2. **Predicts job wait times** using machine learning trained on historical cluster data
3. **Recommends optimal configurations** through an AI assistant that understands your workload
4. **Visualizes resource usage** with interactive charts and dashboards

## ✨ Key Features

### 📊 Real-Time Dashboard
- Live monitoring of cluster-wide CPU, memory, and GPU resources
- Track your active and pending jobs
- Visual representations of resource utilization

### 🎮 GPU Status Monitoring
- Support for multiple GPU types:
  - NVIDIA H200 (latest generation)
  - A100 (40GB & 80GB)
  - A6000, A40
  - V100
  - RTX 3090, RTX 2080Ti
- Partition-specific queue visualization
- Per-GPU-type availability tracking

### 🤖 AI Job Optimizer
- Natural language interface for job configuration
- Intelligent resource recommendations based on workload description
- Context-aware suggestions using conversation history
- Integration with OpenAI GPT models for advanced reasoning

### ⏱️ Wait Time Prediction
- Machine learning model (Random Forest) trained on historical cluster data
- Predicts estimated queue wait times based on:
  - CPU count
  - Memory requirements
  - GPU count
  - Target partition
- Helps users choose the fastest partition for their jobs

## 🛠️ Tech Stack

### Frontend
- **Framework**: React 18 with TypeScript
- **Build Tool**: Vite
- **Styling**: TailwindCSS
- **Animations**: Framer Motion
- **Charts**: Recharts
- **Icons**: Lucide React
- **Routing**: React Router DOM
- **HTTP Client**: Axios

### Backend
- **Framework**: FastAPI (Python)
- **SSH**: Paramiko (persistent SSH connections to HPC cluster)
- **AI**: OpenAI API
- **ML**: scikit-learn, pandas
- **ASGI Server**: Uvicorn

### Machine Learning
- **Algorithm**: Random Forest Regressor
- **Training Data**: Historical SLURM job statistics
- **Features**: CPU count, memory, GPU count, partition (one-hot encoded)
- **Target**: Job wait duration in hours

## 🏗️ Architecture

```
┌─────────────────┐
│  React Frontend │
│   (Vite + TS)   │
└────────┬────────┘
         │
         │ HTTP/REST
         │
┌────────▼────────────────────┐
│   FastAPI Backend           │
│  ┌──────────────────────┐   │
│  │ SSH Connection Mgr   │   │
│  └──────────────────────┘   │
│  ┌──────────────────────┐   │
│  │ OpenAI Integration   │   │
│  └──────────────────────┘   │
│  ┌──────────────────────┐   │
│  │ ML Wait Predictor    │   │
│  └──────────────────────┘   │
└────────┬────────────────────┘
         │
         │ SSH (Paramiko)
         │
┌────────▼────────┐
│  HPC Cluster    │
│  (SLURM/Rivanna)│
└─────────────────┘
```

## 🚀 Getting Started

### Prerequisites
- Python 3.8+
- Node.js 16+
- SSH access to an HPC cluster with SLURM
- OpenAI API key

### Backend Setup

1. Navigate to the server directory:
```bash
cd server
```

2. Create a virtual environment:
```bash
python -m venv venv
source venv/bin/activate  # On Windows: venv\Scripts\activate
```

3. Install dependencies:
```bash
pip install -r requirements.txt
```

4. Create a `.env` file with your credentials:
```env
HPC_HOST=your-hpc-hostname
HPC_USER=your-username
SSH_KEY_PATH=/path/to/your/ssh/private/key
OPENAI_API_KEY=your-openai-api-key
```

5. Start the FastAPI server:
```bash
uvicorn main:app --reload --host 0.0.0.0 --port 8000
```

The API will be available at `http://localhost:8000`

### Frontend Setup

1. Navigate to the webapp directory:
```bash
cd webapp
```

2. Install dependencies:
```bash
npm install
```

3. Start the development server:
```bash
npm run dev
```

The web app will be available at `http://localhost:5173`

## 📡 API Endpoints

### Resource Monitoring
- `GET /` - Health check
- `GET /jobs` - Get user's jobs
- `GET /cpu` - CPU and memory statistics
- `GET /gpu` - Overall GPU statistics

### GPU Queue Monitoring
- `GET /gpu/h200` - H200 partition queue
- `GET /gpu/a100` - A100 partitions queue
- `GET /gpu/a6000` - A6000 partition queue
- `GET /gpu/a40` - A40 partition queue
- `GET /gpu/v100` - V100 partition queue
- `GET /gpu/3090` - RTX 3090 partition queue
- `GET /gpu/2080ti` - RTX 2080Ti partition queue

### AI Features
- `POST /optimize` - Get AI job optimization recommendations
- `POST /predict-wait-time` - Predict queue wait time

See [API_DOCUMENTATION.md](server/API_DOCUMENTATION.md) for detailed endpoint specifications.

## 🧠 Machine Learning Model

The wait time prediction model was trained on historical SLURM job data from the cluster. The training process:

1. **Data Collection**: Historical job submission and start time data
2. **Feature Engineering**:
   - Numerical: CPU count, memory (GB), GPU count
   - Categorical: Partition (one-hot encoded across 20 partitions)
3. **Model Training**: Random Forest Regressor with hyperparameter tuning
4. **Evaluation**: Cross-validation and test set performance metrics

Training notebook: [Model_training+analysis.ipynb](Model_training+analysis.ipynb)

## 🎨 Screenshots

### Dashboard View
Monitor cluster-wide resources and your jobs at a glance.

### GPU Status
Real-time GPU availability across all partitions and types.

### AI Assistant
Conversational interface for job optimization recommendations.

## 🔒 Security Considerations

- SSH keys are never transmitted or stored in the frontend
- All cluster communication happens server-side via persistent SSH connection
- Environment variables protect sensitive credentials
- API endpoints validate input to prevent command injection
- SSH connection uses keep-alive to maintain security context

## 🚧 Future Enhancements

- [ ] Job submission directly from the web interface
- [ ] Historical usage analytics and trends
- [ ] Email/push notifications for job state changes
- [ ] Multi-cluster support
- [ ] Custom alert thresholds for resource availability
- [ ] Job cost estimation (SU/billing units)
- [ ] Comparative analysis of partition performance

## 🤝 Contributing

This project was built for a hackathon. Contributions, issues, and feature requests are welcome!

## 📄 License

This project is open source and available under the MIT License.

## 👥 Team

Built with passion during the hackathon by researchers who understand the pain of HPC job management.

## 🙏 Acknowledgments

- University of Virginia Research Computing for the Rivanna HPC cluster
- OpenAI for providing the GPT API
- The SLURM workload manager team
- All the libraries and frameworks that made this possible

---

**Made with ❤️ for the HPC research community**
