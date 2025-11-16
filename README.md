# RivannaAI

> AI-Powered HPC Cluster Resource Monitoring & Job Optimization Platform

**Empowering students to do groundbreaking research by democratizing access to HPC resources.**

---

## 🎯 TL;DR

Thousands of students compete for limited GPU cluster resources, but **existing monitoring tools only show snapshots—no predictions, no guidance, no transparency**. Students blindly submit jobs with zero visibility into queue wait times or optimal configurations.

**RivannaAI changes everything:**
- **ML-powered wait time predictions**: Know exactly how long you'll wait before submitting
- **AI job optimization**: Describe your workload in plain English, get optimal SLURM configs
- **Real-time cluster intelligence**: Complete visibility across all GPU types and partitions
- **Educational approach**: Learn HPC best practices while you work

**The impact?** Faster research iteration, reduced frustration, and equitable access to computational resources for all students—from first-time HPC users to seasoned researchers.

---

In the era of AI and machine learning, access to GPU clusters is no longer a luxury—it's a necessity. CS students need HPC infrastructure to train models, run simulations, and conduct cutting-edge research. RivannaAI breaks down the barriers that prevent students from effectively utilizing these critical resources.

## 🎯 The Problem: Students Left in the Dark

### The Current Reality
Thousands of students share limited HPC resources, creating massive bottlenecks. **Jobs can sit in queue for hours or even days**, but students have no way to know:
- When their job will actually start running
- Which GPU partition has the shortest wait time
- If they're requesting resources efficiently
- Whether their job configuration is causing unnecessary delays

### Why Existing Tools Fail Students

**Current cluster visualization tools are nearly useless:**
- They show only current snapshot data—no predictive insights
- No queue time estimates or wait time predictions
- No guidance on resource optimization
- Complex SLURM syntax intimidates newcomers
- Zero visibility into which partition to choose for faster execution

**The result?** Students waste countless hours:
- Submitting poorly-configured jobs that wait longer than necessary
- Over-requesting resources "just to be safe" (making queues worse for everyone)
- Checking `squeue` repeatedly with no idea when their job will run
- Missing project deadlines because they can't predict cluster availability
- Getting discouraged and abandoning HPC research altogether

### The Educational Access Crisis

This isn't just about convenience—**it's about equity in education:**
- Graduate students lose valuable research time to cluster inefficiency
- Undergrads can't complete AI/ML coursework assignments on time
- First-time HPC users face a steep, undocumented learning curve
- Students without prior cluster experience are at a massive disadvantage

**Groundbreaking research requires GPUs. Students deserve better than guesswork and endless waiting.**

## 💡 Our Solution: Intelligence That Empowers

RivannaAI transforms HPC access from an intimidating black box into an intelligent, transparent, and student-friendly platform.

### What We Built

**1. Predictive Wait Time Intelligence**
- Machine learning model trained on historical cluster data predicts queue wait times
- Students know *exactly* how long they'll wait before submitting
- Compare wait times across partitions to choose the fastest option
- No more blind submission—make informed decisions

**2. Real-Time Resource Visibility**
- Live monitoring across ALL GPU types (H200, A100, A6000, V100, RTX 3090, etc.)
- Track your jobs and see cluster-wide utilization
- Partition-specific queue visualization shows the full picture
- Finally understand what's actually happening on the cluster

**3. AI-Powered Job Optimization**
- Natural language interface: describe your workload in plain English
- Get intelligent SLURM configuration recommendations
- Learn optimal resource requests for your specific use case
- Reduce queue times by requesting only what you need

**4. Educational & Accessible**
- Demystifies HPC for newcomers
- Teaches efficient resource usage through AI recommendations
- Makes cluster computing accessible to all skill levels
- Empowers students to become better researchers

## 🎓 Impact on Student Success

### Immediate Benefits
- **Reduced Wait Times**: Students make data-driven partition choices, getting results faster
- **Learning by Doing**: AI explanations teach HPC best practices while students work
- **Deadline Confidence**: Predictive wait times let students plan projects accurately
- **Lower Barrier to Entry**: First-time users can submit optimized jobs without weeks of trial-and-error

### Long-Term Research Impact
- **More Experiments, Better Science**: Time saved on cluster management = more time for actual research
- **Equitable Access**: Levels the playing field between HPC veterans and newcomers
- **Efficient Resource Usage**: Educated users make better requests, improving cluster performance for everyone
- **Student Retention**: Reduces frustration that drives students away from computational research

### Why This Matters for Education
In today's AI-driven world, **computational literacy is critical**. Students need hands-on experience with:
- Large-scale model training (LLMs, computer vision, reinforcement learning)
- Distributed computing and parallel processing
- Resource management and optimization
- Real-world research infrastructure

**RivannaAI doesn't just make HPC easier—it makes it accessible, educational, and empowering for the next generation of researchers.**

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

## 🚀 Innovation & Technical Excellence

### What Makes RivannaAI Different

**1. Predictive, Not Just Reactive**
- Most cluster monitoring tools show you *what's happening now*
- We show you *what will happen* when you submit your job
- ML-powered predictions trained on real historical cluster data
- This is the difference between a weather forecast and looking out the window

**2. Bridges the Knowledge Gap**
- Traditional HPC tools assume expert-level knowledge
- We use conversational AI to meet students where they are
- Natural language → optimized SLURM configuration
- Educational approach that teaches while assisting

**3. End-to-End Intelligence**
- Persistent SSH connection for real-time cluster data
- Random Forest model for wait time prediction
- GPT-powered recommendations for job optimization
- Unified platform combining monitoring, prediction, and guidance

**4. Built for Scale & Impact**
- Designed to work with any SLURM-based HPC cluster
- Deployable at universities nationwide
- Addresses a universal problem in academic computing
- Production-ready architecture with FastAPI backend

### Technical Challenges Solved
- **Real-time SSH integration**: Maintaining persistent connections to fetch live cluster data
- **ML model training**: Extracting patterns from millions of historical SLURM jobs
- **Partition complexity**: Supporting 20+ different partitions with varying GPU types
- **User experience**: Making complex HPC concepts intuitive for beginners

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

Built by students who've experienced the frustration of HPC queue uncertainty firsthand. We've sat waiting for jobs, missed deadlines because of cluster unpredictability, and watched peers abandon computational research due to infrastructure barriers.

**We built the tool we wished we had.**

## 🎯 Hackathon Track: Student Success

RivannaAI directly addresses the **Student Success** track by:
- **Removing barriers** to HPC access for undergraduate and graduate students
- **Democratizing computational research** regardless of prior HPC experience
- **Accelerating learning** through AI-guided job optimization
- **Enabling groundbreaking research** by making GPU clusters accessible and understandable
- **Improving equity** in CS education by leveling the playing field

In the AI era, access to computational resources shouldn't be a bottleneck for student success. **RivannaAI ensures every student can focus on discovery, not infrastructure.**

## 🌟 Vision for the Future

This is just the beginning. We envision:
- **Multi-university deployment**: Helping students across institutions
- **Integration with learning management systems**: Embedding HPC education into coursework
- **Advanced analytics**: Helping universities optimize cluster allocation for maximum student impact
- **Community knowledge base**: Students sharing optimized configurations for common workloads

**Our mission**: Make HPC infrastructure invisible so students can focus on what matters—learning and innovation.

## 🙏 Acknowledgments

- University of Virginia Research Computing for the Rivanna HPC cluster
- Students and researchers who inspired this solution through their struggles
- OpenAI for providing the GPT API that powers our AI assistant
- The SLURM workload manager team
- The open-source community

---

**Built with determination for students, by students | Empowering the next generation of computational researchers**
