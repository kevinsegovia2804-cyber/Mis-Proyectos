<!DOCTYPE html>
<html lang="es">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Login - Wenlau Admin</title>
    <link href="https://fonts.googleapis.com/css2?family=Inter:wght@300;400;600&family=Oswald:wght@500&display=swap" rel="stylesheet">
    <link href="https://cdn.jsdelivr.net/npm/bootstrap@5.3.0/dist/css/bootstrap.min.css" rel="stylesheet">
    <link rel="stylesheet" href="https://cdn.jsdelivr.net/npm/bootstrap-icons@1.11.1/font/bootstrap-icons.css">
    
    <style>
        :root {
            --primary-color: #000000;
            --accent-color: #ff4d8d; /* Color rosado tipo cosméticos */
            --bg-gradient: linear-gradient(135deg, #1a1a1a 0%, #000000 100%);
        }

        body {
            font-family: 'Inter', sans-serif;
            background: var(--bg-gradient);
            height: 100vh;
            display: flex;
            align-items: center;
            justify-content: center;
            margin: 0;
            color: #fff;
        }

        .login-card {
            background: rgba(255, 255, 255, 0.05);
            backdrop-filter: blur(15px);
            border: 1px solid rgba(255, 255, 255, 0.1);
            border-radius: 20px;
            padding: 40px;
            width: 100%;
            max-width: 400px;
            box-shadow: 0 25px 50px rgba(0,0,0,0.5);
            transition: transform 0.3s ease;
        }

        .login-card:hover {
            transform: translateY(-5px);
        }

        .brand-logo {
            font-family: 'Oswald', sans-serif;
            font-size: 2.5rem;
            letter-spacing: 3px;
            text-align: center;
            margin-bottom: 10px;
            text-transform: uppercase;
        }

        .admin-label {
            display: block;
            text-align: center;
            font-size: 0.8rem;
            letter-spacing: 2px;
            color: var(--accent-color);
            margin-bottom: 30px;
            text-transform: uppercase;
            font-weight: 600;
        }

        .form-control {
            background: rgba(255, 255, 255, 0.1);
            border: 1px solid rgba(255, 255, 255, 0.1);
            border-radius: 12px;
            color: #fff;
            padding: 12px 15px;
            transition: all 0.3s;
        }

        .form-control:focus {
            background: rgba(255, 255, 255, 0.15);
            border-color: var(--accent-color);
            box-shadow: none;
            color: #fff;
        }

        .form-label {
            font-size: 0.85rem;
            margin-left: 5px;
            color: #bbb;
        }

        .btn-login {
            background: #fff;
            color: #000;
            border: none;
            border-radius: 12px;
            padding: 12px;
            font-weight: 600;
            margin-top: 20px;
            transition: all 0.3s;
        }

        .btn-login:hover {
            background: var(--accent-color);
            color: #fff;
            transform: scale(1.02);
        }

        .error-msg {
            background: rgba(220, 53, 69, 0.1);
            border: 1px solid #dc3545;
            color: #ff858d;
            border-radius: 10px;
            padding: 10px;
            font-size: 0.85rem;
            text-align: center;
            margin-top: 20px;
        }

        .footer-text {
            text-align: center;
            margin-top: 30px;
            font-size: 0.75rem;
            color: #666;
        }
    </style>
</head>
<body>

    <div class="login-card">
        <div class="brand-logo">WENLAU</div>
        <span class="admin-label">Panel de Control</span>

        <form action="validar.php" method="POST">
            <div class="mb-3">
                <label class="form-label"><i class="bi bi-person me-1"></i> Usuario</label>
                <input type="text" name="usuario" class="form-control" placeholder="Ingresa tu usuario" required autocomplete="off">
            </div>
            
            <div class="mb-3">
                <label class="form-label"><i class="bi bi-lock me-1"></i> Contraseña</label>
                <input type="password" name="password" class="form-control" placeholder="••••••••" required>
            </div>

            <button type="submit" class="btn btn-login w-100">
                ENTRAR <i class="bi bi-arrow-right-short"></i>
            </button>

            <?php if (isset($_GET['error'])): ?>
                <div class="error-msg">
                    <i class="bi bi-exclamation-circle me-1"></i> Datos incorrectos, intenta de nuevo.
                </div>
            <?php endif; ?>
        </form>

        <div class="footer-text">
            &copy; <?php echo date('Y'); ?> Wenlau Cosméticos - Privado
        </div>
    </div>

    <script src="https://cdn.jsdelivr.net/npm/bootstrap@5.3.0/dist/js/bootstrap.bundle.min.js"></script>
</body>
</html>