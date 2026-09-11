# AchouAI 1.0 — produto base final

**Slogan:** Você procura. O AchouAI encontra.

## O que já está pronto
- Interface mobile-first com identidade AchouAI.
- Busca em linguagem natural.
- Interpretação de orçamento, por exemplo `até R$200`.
- Ranking por orçamento, desconto, avaliação e preço.
- Integração oficial preparada para Mercado Livre via `ML_ACCESS_TOKEN`.
- Fallback demonstrativo quando nenhuma API estiver configurada.
- Favoritos e alertas salvos no aparelho/navegador.
- Área de perfil/preferências.
- PWA manifest para instalação como app web.
- Backend separado para manter tokens fora do frontend.
- Endpoint de saúde em `/api/health`.

## Rodar no computador
Requer Node.js 18+.

```bash
npm start
```
Abra `http://localhost:3000`.

## Mercado Livre
Crie/configure o acesso conforme a documentação oficial do Mercado Livre e coloque o token somente no servidor:

```bash
ML_ACCESS_TOKEN=SEU_TOKEN npm start
```

Nunca coloque o token no HTML/JavaScript do navegador.

## Afiliados
O produto está preparado para receber links rastreáveis. A geração/uso de links de afiliado precisa ser feita de acordo com o programa e as regras de cada parceiro. O MVP não inventa links de afiliado.

## Próximo passo para lançamento
1. Hospedar o backend em HTTPS.
2. Configurar Mercado Livre e demais parceiros autorizados.
3. Adicionar banco de dados para usuários e histórico de preços.
4. Implementar notificações reais de alertas.
5. Configurar domínio e política de privacidade/LGPD.
6. Gerar AAB assinado para Google Play.

## Build automático do APK
O diretório `.github/workflows/build-apk.yml` está incluído como base para gerar o APK Android do projeto nativo separado.
