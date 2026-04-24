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
        "ms": "0.000"
    }

    if not resp.startswith("OK:STATUS"):
        return data

    parts = resp.split("|")
    for part in parts[1:]:
        if "=" in part:
            k, v = part.split("=", 1)
            data[k.strip()] = v.strip()

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
        return jsonify({"ok": False, "error": "No autorizado"}), 401

    data = request.get_json(silent=True) or {}
    action = str(data.get("action", "")).strip().upper()

    valid = {
        "RIGHT": "RIGHT",
        "LEFT": "LEFT",
        "STOP": "STOP",
        "RESET": "RESET"
    }

    if action not in valid:
        return jsonify({"ok": False, "error": "Acción inválida"}), 400

    resp = send_cmd(valid[action])
    return jsonify({"ok": resp.startswith("OK"), "cmd": valid[action], "resp": resp})


@app.get("/status")
def status():
    if not is_logged_in():
        return jsonify({"ok": False, "error": "No autorizado"}), 401

    resp = send_cmd("GET_STATUS")
    info = parse_status(resp)

    return jsonify({
        "ok": resp.startswith("OK:STATUS"),
        "raw": resp,
        "estado": info["estado"],
        "pulsos": info["pulsos"],
        "vueltas": info["vueltas"],
        "ms": info["ms"]
    })


if __name__ == "__main__":
    app.run(host="0.0.0.0", port=5000, debug=True)
