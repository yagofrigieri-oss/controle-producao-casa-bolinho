import "./globals.css";

export const metadata = {
  title: "Controle de Produção | Casa do Bolinho de Frango",
  description: "Controle de produção, empacotamento e divergências"
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="pt-BR">
      <body>{children}</body>
    </html>
  );
}
