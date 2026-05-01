import socket
import serial
import time

SERIAL_PORT = "/dev/ttyACM0"
BAUDRATE = 115200

HOST = "0.0.0.0"
PORT = 5001

VALID_CMDS = {
    "RIGHT",
    "LEFT",
    "STOP",
    "RESET",
    "GET_STATUS"
}


def comando_valido(cmd):
    if cmd in VALID_CMDS:
        return True

    if cmd.startswith("SET_REF:"):
        return True

    if cmd.startswith("SET_REF="):
        return True

    return False


def leer_respuesta(ser):
    inicio = time.time()

    while time.time() - inicio < 2:
        linea = ser.readline().decode("utf-8", errors="ignore").strip()

        if linea:
            return linea

    return "ERR:TIMEOUT"


def main():
    ser = serial.Serial(SERIAL_PORT, BAUDRATE, timeout=1)
    time.sleep(2)

    ser.reset_input_buffer()

    print(f"Conectado a Arduino en {SERIAL_PORT} a {BAUDRATE} baudios")
    print(f"Servidor MOTOR escuchando en {HOST}:{PORT}...")

    with socket.socket(socket.AF_INET, socket.SOCK_STREAM) as s:
        s.setsockopt(socket.SOL_SOCKET, socket.SO_REUSEADDR, 1)
        s.bind((HOST, PORT))
        s.listen(5)

        while True:
            conn, addr = s.accept()

            with conn:
                print(f"Conexión desde {addr}")

                data = conn.recv(1024)

                if not data:
                    continue

                cmd = data.decode("utf-8", errors="ignore").strip().upper()

                if not comando_valido(cmd):
                    conn.sendall(b"ERR:CMD\n")
                    continue

                ser.reset_input_buffer()
                ser.write((cmd + "\n").encode("utf-8"))
                ser.flush()

                resp = leer_respuesta(ser)

                conn.sendall((resp + "\n").encode("utf-8"))


if __name__ == "__main__":
    main()
