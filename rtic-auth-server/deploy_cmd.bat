docker build --platform linux/amd64 -t gcr.io/researchtopics/rtic-auth-server . 
gcloud auth configure-docker
docker push gcr.io/researchtopics/rtic-auth-server
gcloud run deploy rtic-auth-server --image gcr.io/researchtopics/rtic-auth-server --platform managed --region europe-west4 --allow-unauthenticated --port 8080