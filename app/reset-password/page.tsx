"use client";

import { useState } from "react";
import { supabase } from "../../lib/supabase";

export default function ResetPasswordPage() {
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [message, setMessage] = useState("");
  const [loading, setLoading] = useState(false);

  async function handleUpdatePassword(e: React.FormEvent) {
    e.preventDefault();

    if (password.length < 6) {
      setMessage("A senha precisa ter pelo menos 6 caracteres.");
      return;
    }

    if (password !== confirmPassword) {
      setMessage("As senhas não são iguais.");
      return;
    }

    setLoading(true);
    setMessage("");

    const { error } = await supabase().auth.updateUser({
      password,
    });

    setLoading(false);

    if (error) {
      setMessage("Não foi possível alterar a senha. Tente novamente.");
      return;
    }

    setMessage("Senha alterada com sucesso! Agora você pode entrar no sistema.");
  }

  return (
    <main className="login-page">
      <div className="login-card">
        <h1>Nova senha</h1>
        <p>Digite sua nova senha para acessar o sistema.</p>

        <form onSubmit={handleUpdatePassword}>
          <input
            type="password"
            placeholder="Nova senha"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
          />

          <input
            type="password"
            placeholder="Confirme a nova senha"
            value={confirmPassword}
            onChange={(e) => setConfirmPassword(e.target.value)}
            required
          />

          <button type="submit" disabled={loading}>
            {loading ? "Salvando..." : "Alterar senha"}
          </button>
        </form>

        {message && <p>{message}</p>}
      </div>
    </main>
  );
}
