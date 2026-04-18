from locust import FastHttpUser, task

class BrokerApiUser(FastHttpUser):
  host = "http://localhost:8000"

  @task
  def optimize(self):
    self.client.get("/v1/optimizations/sync")
