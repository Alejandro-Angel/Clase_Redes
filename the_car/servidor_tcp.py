import socket
import serial
import time

# --- CONFIGURACIÓN ---
SERIAL_PORT = "/dev/ttyACM0"
BAUDRATE = 115200

HOST = "0.0.0.0"
PORT = 5001
# ----------------------


def parse_cmd(cmd: str):
    cmd = cmd.strip().upper()

    if cmd == "PING":
        return True, "PING"

    comandos_validos = ("F", "B", "L", "R", "S", "G", "H", "T", "A", "Z")

    if cmd not in comandos_validos:
        return False, None

    # El Arduino original del carrito espera comandos así:
    # %F#
    # %B#
    # %L#
    # %R#
    # %S#
    comando_arduino = f"%{cmd}#"

    return True, comando_arduino


def main():
    print("Iniciando servidor TCP del carrito...")
    print(f"Puerto serial: {SERIAL_PORT}")
    print(f"Baudrate: {BAUDRATE}")

    ser = serial.Serial(SERIAL_PORT, BAUDRATE, timeout=1)
    time.sleep(2)

    ser.reset_input_buffer()
    ser.reset_output_buffer()

    print(f"Conectado a Arduino en {SERIAL_PORT} a {BAUDRATE} baudios")
    print(f"Servidor escuchando en {HOST}:{PORT}...")

    with socket.socket(socket.AF_INET, socket.SOCK_STREAM) as s:
        s.setsockopt(socket.SOL_SOCKET, socket.SO_REUSEADDR, 1)
        s.bind((HOST, PORT))
        s.listen(5)

        while True:
            conn, addr = s.accept()

            with conn:
                data = conn.recv(1024)

                if not data:
                    continue

                raw = data.decode("utf-8", errors="ignore").strip()
                ok, cmd = parse_cmd(raw)

                if not ok:
                    conn.sendall(b"ERR:CMD\n")
                    continue

                if cmd == "PING":
                    conn.sendall(b"OK:PING\n")
                    continue

                try:
                    ser.write(cmd.encode("utf-8"))
                    ser.flush()

                    respuesta = f"OK:{cmd}"

                except Exception as e:
                    respuesta = f"ERR:{e}"

                conn.sendall((respuesta + "\n").encode("utf-8"))


if __name__ == "__main__":
    main()
