#!/usr/bin/env python3
# -*- coding: utf-8 -*-

from flask import Flask, render_template, request, redirect, url_for, session, jsonify
from werkzeug.security import check_password_hash
import socket

# ====== CREDENCIALES ======
APP_USER = "Alejandro"
APP_PW_HASH = "scrypt:32768:8:1$qlO2R6KdF7MWpFjw$a8163cacd1b03e75fcf7b550d8eceefdd2a42f04af3aa956e364dbc50141d9c2e8fe286d60fca5af515e847be967c9fc51c3782b0f9c23a5b40c5317fc7864da"
SECRET_KEY = "REDES"

# ====== TCP HACIA servidor_tcp.py ======
TCP_HOST = "127.0.0.1"
TCP_PORT = 5001

app = Flask(
    __name__,
    template_folder="templates",
    static_folder="static",
    static_url_path="/static"
)
app.secret_key = SECRET_KEY


def is_logged_in():
    return session.get("logged_in") is True


def send_cmd(cmd: str) -> str:
    with socket.create_connection((TCP_HOST, TCP_PORT), timeout=3) as s:
        s.sendall((cmd.strip() + "\n").encode("utf-8"))
        data = b""
        while b"\n" not in data:
            chunk = s.recv(1024)
            if not chunk:
                break
            data += chunk
        return data.decode("utf-8", errors="ignore").strip()


@app.route("/login", methods=["GET", "POST"])
def login():
    if request.method == "POST":
        user = request.form.get("username", "").strip()
        pw = request.form.get("password", "")

        if user == APP_USER and check_password_hash(APP_PW_HASH, pw):
            session["logged_in"] = True
            return redirect(url_for("index"))

        return render_template("login.html", error="Usuario o contraseña incorrectos")

    return render_template("login.html", error=None)


@app.route("/logout")
def logout():
    session.clear()
    return redirect(url_for("login"))


@app.route("/")
def index():
    if not is_logged_in():
        return redirect(url_for("login"))
    return render_template("index.html")


@app.get("/api/data")
def get_data():
    if not is_logged_in():
        return jsonify({"ok": False, "error": "No autorizado"}), 401

    try:
        resp = send_cmd("GET_DATA")

        data = {
            "temperatura": "--",
            "rango": "--",
            "pwm": "--",
            "estado": "--",
            "ok": True
        }

        parts = resp.split(",")
        for part in parts:
            if ":" in part:
                key, value = part.split(":", 1)
                key = key.strip().upper()
                value = value.strip()

                if key == "TEMP":
                    data["temperatura"] = value
                elif key == "RANGO":
                    data["rango"] = value
                elif key == "PWM":
                    data["pwm"] = value
                elif key == "ESTADO":
                    data["estado"] = value

        return jsonify(data)

    except Exception:
        return jsonify({
            "ok": False,
            "temperatura": "--",
            "rango": "--",
            "pwm": "--",
            "estado": "Sin comunicación"
        })


@app.get("/api/ping")
def ping():
    if not is_logged_in():
        return jsonify({"ok": False, "error": "No autorizado"}), 401
    return jsonify({"ok": True})


if __name__ == "__main__":
    app.run(host="0.0.0.0", port=5000, debug=True)
