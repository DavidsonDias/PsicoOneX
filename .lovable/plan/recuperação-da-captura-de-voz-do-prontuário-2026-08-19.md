# Recuperação da captura de voz do prontuário

## Objetivo
Eliminar a regressão que descarta grande parte da sessão e recuperar transcrição contínua e precisa em celular, tablet e computador.

## Implementação
- Recalibrar a detecção de fala para nunca depender de um limiar que sobe durante a própria conversa.
- Manter um pequeno pré-buffer e avaliar atividade ao longo da janela inteira, preservando voz baixa, distante e vinda do alto-falante de chamadas.
- Ajustar o processamento do microfone para não cancelar agressivamente a voz remota reproduzida pelo dispositivo.
- Fechar janelas em pausas naturais sem perder o início/fim das frases e manter um limite máximo previsível.
- Tornar retomada de `AudioContext`, background e ordenação das transcrições mais resilientes.
- Manter a trava em português e o filtro de alucinações no servidor, sem descartar português válido.
- Adicionar testes determinísticos para limiar adaptativo, voz baixa, pausas e silêncio.

## Validação
- Executar os testes focados do pipeline de áudio.
- Validar compilação e fluxo de gravação/transcrição no preview.
- Testar a função de transcrição publicada com áudio WAV real e conferir a resposta do gateway.

## Observação técnica
Navegadores móveis podem suspender qualquer PWA quando o sistema operacional encerra o processo. A implementação maximizará continuidade em segundo plano e evitará perda enquanto o processo permanece ativo, sem prometer uma capacidade que Android/iOS não garantem para páginas web.
