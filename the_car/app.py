from flask import Flask, render_template, request, redirect, url_for, session, jsonify, send_from_directory
from werkzeug.security import check_password_hash
import socket

APP_USER = "Alejandro"
APP_PW_HASH = "scrypt:32768:8:1$NCaNS5WcYKTmhRNv$fb0edee7d87154926dfb4563f6ab8579a22e2f79a9b32aaa89b5ba169089e0c01ed6572f9d37bc5fe1c2f457d599f64bdb22cfbca6c89a3bbccbe602e3ecd356"
SECRET_KEY = "12345"

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


@app.route("/multimedia/<path:filename>")
def multimedia(filename):
    if not is_logged_in():
        return redirect(url_for("login"))

    return send_from_directory("multimedia", filename)


@app.post("/car_cmd")
def car_cmd():
    if not is_logged_in():
        return jsonify({"ok": False, "error": "No autorizado"}), 401

    data = request.get_json(silent=True) or {}
    cmd = str(data.get("cmd", "")).strip().upper()

    comandos_validos = {
        "F": "Adelante",
        "B": "Atrás",
        "L": "Izquierda",
        "R": "Derecha",
        "S": "Stop",
        "G": "Servo arriba",
        "H": "Servo abajo",
        "T": "Seguidor de línea",
        "A": "Evasión ultrasónica",
        "Z": "Seguir objeto"
    }

    if cmd not in comandos_validos:
        return jsonify({"ok": False, "error": "Comando inválido"}), 400

    try:
        resp = send_cmd(cmd)

        return jsonify({
            "ok": resp.startswith("OK"),
            "cmd": cmd,
            "accion": comandos_validos[cmd],
            "resp": resp
        })

    except Exception as e:
        return jsonify({
            "ok": False,
            "cmd": cmd,
            "error": str(e)
        }), 500


@app.get("/status")
def status():
    if not is_logged_in():
        return jsonify({"ok": False, "error": "No autorizado"}), 401

    try:
        resp = send_cmd("PING")
        return jsonify({"ok": resp.startswith("OK"), "resp": resp})
    except Exception as e:
        return jsonify({"ok": False, "error": str(e)})


if __name__ == "__main__":
    app.run(host="0.0.0.0", port=5000, debug=True)
