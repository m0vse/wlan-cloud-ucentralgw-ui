FROM python:3.13-alpine
WORKDIR /app
COPY server.py /app/server.py
COPY test_server.py test_access_http.py test_mlo.py test_details.py /app/
RUN python -B -m unittest -v test_server.py test_access_http.py test_mlo.py test_details.py
USER 65534:65534
EXPOSE 8080
CMD ["python", "-B", "/app/server.py"]
