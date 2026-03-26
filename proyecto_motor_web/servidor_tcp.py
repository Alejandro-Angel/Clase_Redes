#!/usr/bin/env python3
# -*- coding: utf-8 -*-

import socket
import serial
import time

HOST = "0.0.0.0"
PORT = 5001
SERIAL_PORT = "/dev/ttyUSB0"   # cambia a /dev/ttyUSB0 si es necesario
BAUDRATE = 9600

try:
    arduino = serial.Serial(SERIAL_PORT, BAUDRATE, timeout=2)
    time.sleep(2)
    print(f"Arduino conectado en {SERIAL_PORT}")
except Exception as e:
    print("No se pudo abrir el puerto serial:", e)
    raise


def leer_arduino():
    arduino.reset_input_buffer()
    arduino.write(b"GET_DATA\n")

    timeout_inicio = time.time()

    while True:
        if time.time() - timeout_inicio > 3:
            return "TEMP:--,RANGO:--,PWM:--,ESTADO:Sin respuesta"

        respuesta = arduino.readline().decode("utf-8", errors="ignore").strip()

        if respuesta.startswith("TEMP:"):
            return respuesta


server = socket.socket(socket.AF_INET, socket.SOCK_STREAM)
server.setsockopt(socket.SOL_SOCKET, socket.SO_REUSEADDR, 1)
server.bind((HOST, PORT))
server.listen(5)

print(f"Servidor TCP escuchando en {HOST}:{PORT}")

while True:
    conn, addr = server.accept()
    print("Conexion desde:", addr)

    try:
        data = conn.recv(1024).decode("utf-8", errors="ignore").strip()

        if data == "GET_DATA":
            respuesta = leer_arduino()
            conn.sendall((respuesta + "\n").encode("utf-8"))
        else:
            conn.sendall(b"TEMP:--,RANGO:--,PWM:--,ESTADO:Comando invalido\n")

    except Exception as e:
        print("Error:", e)
        try:
            conn.sendall(b"TEMP:--,RANGO:--,PWM:--,ESTADO:Error de servidor\n")
        except Exception:
            pass

    finally:
        conn.close()
