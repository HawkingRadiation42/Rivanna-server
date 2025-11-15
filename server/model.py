import pickle
import pandas as pd

class JobWaitDurationPredictor:
    def __init__(self, model_path='random_forest_model.pkl'):
        with open(model_path, 'rb') as f:
            self.model = pickle.load(f)
        # Define the partition columns based on the training data
        self.partition_columns = [
            'Partition_bii', 'Partition_bii-gpu', 'Partition_bii-largemem', 'Partition_dedicated',
            'Partition_gpu-a100-40', 'Partition_gpu-a100-80', 'Partition_gpu-a40', 'Partition_gpu-a6000',
            'Partition_gpu-h200', 'Partition_gpu-mig', 'Partition_gpu-v100', 'Partition_interactive-afton',
            'Partition_interactive-rivanna', 'Partition_interactive-rtx2080', 'Partition_interactive-rtx3090',
            'Partition_parallel', 'Partition_standard-afton', 'Partition_standard-afton-largemem',
            'Partition_standard-rivanna', 'Partition_standard-rivanna-largemem'
        ]

    def predict_wait_duration(self, alloc_cpus, req_mem_gb, gpu_count, partition):
        # Create a dictionary for the input features
        input_data = {
            'AllocCPUS': [alloc_cpus],
            'ReqMem_GB': [req_mem_gb],
            'GPU_Count': [gpu_count]
        }
        # Add partition dummies, all False except the matching one
        for col in self.partition_columns:
            input_data[col] = [col == f'Partition_{partition}']
        
        # Create DataFrame
        input_df = pd.DataFrame(input_data)
        
        # Predict
        prediction = self.model.predict(input_df)[0]
        return prediction