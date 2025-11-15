"""
Create a dummy Random Forest model for testing the wait time prediction endpoint.
This is a simplified version - replace with your actual trained model.
"""
import pickle
import numpy as np
from sklearn.ensemble import RandomForestRegressor
from sklearn.datasets import make_regression

# Create dummy training data
# Features: AllocCPUS, ReqMem_GB, GPU_Count, + partition dummies
n_samples = 1000
n_features = 22  # 3 base features + 19 partition dummies

X, y = make_regression(n_samples=n_samples, n_features=n_features, noise=10, random_state=42)

# Make y values reasonable for wait times (in minutes)
y = np.abs(y) / 100  # Scale down to reasonable wait times
y = np.clip(y, 5, 1440)  # Clip between 5 minutes and 24 hours

# Train a simple Random Forest
model = RandomForestRegressor(n_estimators=100, random_state=42, max_depth=10)
model.fit(X, y)

# Save the model
with open('random_forest_model.pkl', 'wb') as f:
    pickle.dump(model, f)

print("✓ Dummy model created successfully!")
print(f"  Model file: random_forest_model.pkl")
print(f"  Training samples: {n_samples}")
print(f"  Features: {n_features}")
print(f"  R² Score: {model.score(X, y):.3f}")
print("\nNote: This is a DUMMY model for testing only!")
print("Replace with your actual trained model for production use.")
