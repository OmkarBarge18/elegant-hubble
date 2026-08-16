import socketserver
import threading
import server

def start_server(port):
    print(f"Starting ElegantHubble server on port {port}...")
    try:
        with socketserver.TCPServer(("", port), server.RequestHandler) as httpd:
            httpd.serve_forever()
    except Exception as e:
        print(f"Port {port} notice: {e}")

if __name__ == '__main__':
    ports = [8000, 3000]
    threads = []
    
    print("=======================================================")
    print("ElegantHubble Dual-Port Server Online!")
    print("Port 8000: http://localhost:8000")
    print("Port 3000: http://localhost:3000")
    print("=======================================================")
    
    for p in ports:
        t = threading.Thread(target=start_server, args=(p,), daemon=True)
        t.start()
        threads.append(t)
        
    for t in threads:
        t.join()
