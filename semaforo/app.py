from flask import Flask, render_template, request, redirect, url_for, session, jsonify
from werkzeug.security import check_password_hash
import socket

APP_USER = "Alejandro"
APP_PW_HASH = "scrypt:32768:8:1$GJouPBAVNMYem8Dk$3e204f0fa156d6367fdcc354fa2feb0c2f10f43d0a4a42a61c9e6f0211c592c5834b88fb4af6dd94baa9461280bd48ebe2a1a0050d3f47a606ee8bd2d722a052"
SECRET_KEY = "1234"

TCP_HOST = "127.0.0.1"
TCP_PORT = 5001

app = Flask(__name__)
app.secret_key = SECRET_KEY


def is_logged_in():
    return session.get("logged_in") is True


def send_cmd(cmd: str) -> str:
    with socket.create_connection((TCP_HOST, TCP_PORT), timeout=3) as s:
        s.sendall((cmd + "\n").encode("utf-8"))
        return s.recv(1024).decode("utf-8", errors="ignore").strip()


def parse_status(resp: str):
    data = {
        "estado": "PARO",
        "pulsos": "0",
        "vueltas": "0.00",
        "rpm": "0.0",
        "referencia": "100.0",
        "error": "0.0",
        "errorabs": "0.0",
        "errorpct": "0.0",
        "pwm": "0",
        "semaforo": "ROJO"
    }

    if not resp.startswith("OK:STATUS"):
        return data

    partes = resp.split("|")

    for parte in partes[1:]:
        if "=" in parte:
            clave, valor = parte.split("=", 1)
            data[clave.strip()] = valor.strip()

    return data


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


@app.post("/motor_cmd")
def motor_cmd():
    if not is_logged_in():
        return jsonify({
            "ok": False,
            "error": "No autorizado"
        }), 401

    data = request.get_json(silent=True) or {}
    action = str(data.get("action", "")).strip().upper()

    valid = {
        "RIGHT": "RIGHT",
        "LEFT": "LEFT",
        "STOP": "STOP",
        "RESET": "RESET"
    }

    if action not in valid:
        return jsonify({
            "ok": False,
            "error": "Acción inválida"
        }), 400

    try:
        resp = send_cmd(valid[action])

        return jsonify({
            "ok": resp.startswith("OK"),
            "cmd": valid[action],
            "resp": resp
        })

    except Exception as e:
        return jsonify({
            "ok": False,
            "error": str(e)
        }), 500


@app.post("/set_reference")
def set_reference():
    if not is_logged_in():
        return jsonify({
            "ok": False,
            "error": "No autorizado"
        }), 401

    data = request.get_json(silent=True) or {}

    try:
        referencia = float(data.get("referencia", 0))

        if referencia < 0:
            referencia = 0

        resp = send_cmd(f"SET_REF:{referencia:.1f}")

        return jsonify({
            "ok": resp.startswith("OK:REF"),
            "resp": resp,
            "referencia": referencia
        })

    except Exception as e:
        return jsonify({
            "ok": False,
            "error": str(e)
        }), 500


@app.get("/status")
def status():
    if not is_logged_in():
        return jsonify({
            "ok": False,
            "error": "No autorizado"
        }), 401

    try:
        resp = send_cmd("GET_STATUS")
        info = parse_status(resp)

        return jsonify({
            "ok": resp.startswith("OK:STATUS"),
            "raw": resp,
            "estado": info["estado"],
            "pulsos": info["pulsos"],
            "vueltas": info["vueltas"],
            "rpm": info["rpm"],
            "referencia": info["referencia"],
            "error": info["error"],
            "errorabs": info["errorabs"],
            "errorpct": info["errorpct"],
            "pwm": info["pwm"],
            "semaforo": info["semaforo"]
        })

    except Exception as e:
        return jsonify({
            "ok": False,
            "error": str(e)
        }), 500


if __name__ == "__main__":
    app.run(host="0.0.0.0", port=5000, debug=True)
