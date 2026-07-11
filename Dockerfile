# 1. Use an official lightweight Python image
FROM python:3.11-slim

# 2. Set the folder inside the container where our code will live
WORKDIR /app

# 3. Copy our dependencies list and install them
COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

# 4. Copy the rest of our application code into the container
COPY . .

# 5. Tell the container to start our Flask app when it boots up
CMD ["python", "app.py"]