# Novas Funcionalidades Avançadas - WhatsHybrid Lite

## 📋 Índice

1. [Templates de Mensagens](#1-templates-de-mensagens)
2. [Sistema Anti-Ban Inteligente](#2-sistema-anti-ban-inteligente)
3. [Importação Avançada de Contatos](#3-importação-avançada-de-contatos)
4. [Cache de Grupos](#4-cache-de-grupos)
5. [Notificações Desktop](#5-notificações-desktop)
6. [Agendamentos Múltiplos](#6-agendamentos-múltiplos)

---

## 1. Templates de Mensagens

### Visão Geral
Sistema de templates reutilizáveis com variáveis dinâmicas para mensagens frequentes.

### Localização
**Config** → **Templates de Mensagens**

### Funcionalidades

#### Criar Template
1. Digite o nome do template
2. Selecione a categoria (Geral, Vendas, Suporte, Marketing)
3. Escreva a mensagem usando variáveis:
   - `{nome}` - Nome do contato
   - `{empresa}` - Empresa do contato
   - `{data}` - Data atual (DD/MM/AAAA)
   - `{hora}` - Hora atual (HH:MM)
4. Clique em **Salvar Template**

#### Usar Template
1. Na lista de templates, clique em **✅ Usar**
2. O template será automaticamente inserido no campo de mensagem
3. As variáveis serão substituídas no momento do envio

#### Exportar/Importar
- **Exportar**: Salva todos os templates em um arquivo JSON
- **Importar**: Carrega templates de um arquivo JSON (faz merge com existentes)

### Exemplo de Uso
```
Olá {nome}!

Somos da empresa {empresa} e temos uma proposta especial para você.

Data: {data}
Hora: {hora}

Entre em contato conosco!
```

---

## 2. Sistema Anti-Ban Inteligente

### Visão Geral
Previne detecção de automação pelo WhatsApp usando técnicas avançadas.

### Localização
**Config** → **Anti-Ban Inteligente**

### Funcionalidades

#### Delay Inteligente
- **Distribuição Gaussiana**: Variação natural de delays (não linear)
- **Micro-variações**: Adiciona ±1 segundo aleatório
- **Pausas Ocasionais**: 10% de chance de pausa extra (simula distração)

#### Limite Diário
- Configure o máximo de mensagens por dia (1-1000)
- Contador automático reseta à meia-noite
- Barra de progresso visual
- Alerta ao atingir 80% do limite

#### Horário Comercial
- Ative para enviar apenas entre 8h-20h
- Pausa automática fora do horário

#### Detecção de Padrões Suspeitos
- **Rapid Fire**: Detecta mais de 5 mensagens em 30 segundos
- **Same Message**: Detecta mesma mensagem para 10+ contatos seguidos

### Como Usar
1. Configure o limite diário desejado
2. Ative/desative horário comercial conforme necessário
3. Use **Reset Contador** apenas para testes ou situações especiais

### Dicas
- Mantenha o limite diário abaixo de 200 para máxima segurança
- Use delays maiores (5-10s) para campanhas grandes
- Varie as mensagens usando templates com variáveis

---

## 3. Importação Avançada de Contatos

### Visão Geral
Importação de contatos via Excel (.xlsx) com validação e deduplicação automática.

### Localização
**Principal** → **Importar Excel**

### Funcionalidades

#### Formatos Suportados
- Excel (.xlsx, .xls)
- CSV (já existente)

#### Validação Automática
- Remove caracteres não numéricos
- Adiciona código do país (55 para Brasil)
- Valida formato (10-15 dígitos)
- Corrige números brasileiros (adiciona 9 após DDD se necessário)

#### Deduplicação
- Remove números duplicados automaticamente
- Mostra estatísticas detalhadas

#### Preview Antes de Importar
Modal mostrando:
- Total de contatos encontrados
- Contatos válidos
- Contatos inválidos descartados
- Duplicados removidos
- Lista final para confirmar (primeiros 20)

### Como Usar
1. Prepare arquivo Excel com números em qualquer coluna/linha
2. Clique em **📊 Importar Excel**
3. Selecione o arquivo
4. Revise o preview
5. Clique em **✅ Importar** para confirmar

### Formatos Aceitos
```
5511999998888
11999998888
(11) 99999-8888
+55 11 99999-8888
```

Todos são normalizados para: `5511999998888`

---

## 4. Cache de Grupos

### Visão Geral
Sistema de cache para carregar grupos mais rapidamente (5 minutos de validade).

### Localização
Automático ao carregar grupos

### Funcionalidades

#### Cache Automático
- Salva grupos após primeira carga
- Validade: 5 minutos
- Indicador visual quando usando cache

#### Forçar Atualização
- Use o botão de refresh para buscar novos grupos
- Limpa o cache automaticamente

### Como Funciona
1. Primeira carga: Busca grupos do WhatsApp Web (lento)
2. Cargas subsequentes (<5 min): Usa cache (instantâneo)
3. Após 5 minutos: Cache expira, próxima carga busca do WhatsApp

### Benefícios
- Carregamento instantâneo de grupos
- Reduz requisições ao WhatsApp Web
- Menor consumo de recursos

---

## 5. Notificações Desktop

### Visão Geral
Alertas desktop e sonoros para eventos importantes.

### Localização
**Config** → **Notificações**

### Funcionalidades

#### Tipos de Notificação
1. **Campanha Concluída**: Ao terminar envio de mensagens
2. **Erro na Campanha**: Se houver falha crítica
3. **Limite Diário**: Ao atingir 80% do limite
4. **Campanha Agendada**: Quando agendamento inicia

#### Sons
- **Sucesso**: Acorde maior (C-E-G)
- **Erro**: Sequência descendente (A-G-F)
- **Aviso**: Alerta (C-B)
- Gerados via Web Audio API (sem arquivos externos)

### Configurações
- ✅ **Ativar notificações**: Liga/desliga notificações
- ✅ **Ativar sons**: Liga/desliga sons de alerta
- 🔔 **Testar**: Envia notificação de teste

### Permissões
A extensão solicita permissão de notificações automaticamente no primeiro uso.

---

## 6. Agendamentos Múltiplos

### Visão Geral
Agende múltiplas campanhas para horários específicos usando chrome.alarms API.

### Localização
**Config** → **Agendamentos**

### Funcionalidades

#### Criar Agendamento
1. Configure campanha normalmente (números + mensagem)
2. Vá para Config → Agendamentos
3. Digite nome da campanha
4. Selecione data e hora
5. Clique em **➕ Agendar**

#### Visualizar Agendamentos
Lista mostra para cada agendamento:
- Nome da campanha
- Data/hora programada
- Tempo restante (se pendente)
- Número de contatos
- Status (pending/completed/failed)

#### Executar Automaticamente
- chrome.alarms dispara no horário programado
- Notificação desktop avisa que campanha iniciou
- Campanha executa automaticamente (se WhatsApp Web estiver aberto)

#### Gerenciar
- **🗑️ Excluir**: Remove agendamento pendente
- Agendamentos completados/falhos são limpos após 24h

### Estados
- **pending**: Aguardando horário
- **completed**: Executado com sucesso
- **failed**: Falhou (ex: WhatsApp não aberto)

### Como Usar
1. Configure campanha na view Principal
2. Vá para Config → Agendamentos
3. Agende para horário futuro
4. Mantenha WhatsApp Web aberto no horário agendado
5. Campanha executará automaticamente

### Limitações
- WhatsApp Web deve estar aberto para executar
- Máximo de delay entre agendamentos: 24 horas recomendado
- Chrome deve estar aberto (mesmo minimizado)

---

## 🔧 Arquitetura Técnica

### Novos Arquivos

#### Utilitários
- `utils/anti-ban.js` - Sistema anti-ban
- `utils/templates.js` - Gerenciador de templates
- `utils/notifications.js` - Sistema de notificações
- `utils/group-cache.js` - Cache de grupos
- `utils/contact-importer.js` - Importador de contatos
- `utils/scheduler.js` - Sistema de agendamentos

#### Integração
- `sidepanel-advanced-features.js` - Controlador de integração

### Permissões Adicionadas
- `notifications` - Para notificações desktop
- `alarms` - Para agendamentos com chrome.alarms

### Dependências Externas
- **SheetJS** (xlsx) - Importação de arquivos Excel
  - CDN: https://cdn.sheetjs.com/xlsx-0.20.1/package/dist/xlsx.full.min.js

---

## 🎨 UI/UX

### Localização das Novas Seções
Todas as novas funcionalidades estão na **view Config**:
1. Templates de Mensagens
2. Anti-Ban Inteligente
3. Notificações
4. Agendamentos

### Importação Excel
Botão adicional na **view Principal** ao lado de "Importar CSV"

---

## 🧪 Testes

### Testar Templates
1. Crie template com `{nome}` e `{data}`
2. Use o template
3. Verifique se variáveis foram inseridas
4. Envie para 1 contato de teste
5. Confirme substituição correta

### Testar Anti-Ban
1. Configure limite baixo (ex: 10)
2. Envie campanha pequena
3. Observe contador aumentar
4. Verifique barra de progresso
5. Teste reset contador

### Testar Notificações
1. Ative notificações e sons
2. Clique em "Testar Notificação"
3. Confirme notificação apareceu
4. Confirme som tocou
5. Complete uma campanha pequena
6. Verifique notificação de conclusão

### Testar Importação Excel
1. Crie arquivo Excel com números variados
2. Inclua duplicados e inválidos
3. Importe o arquivo
4. Verifique estatísticas no preview
5. Confirme importação
6. Verifique números no textarea

### Testar Agendamentos
1. Configure campanha pequena (2-3 números)
2. Agende para 2-3 minutos no futuro
3. Aguarde horário
4. Verifique notificação
5. Confirme campanha iniciou automaticamente

---

## 🚀 Próximos Passos

### Melhorias Futuras
1. **Templates**: Suporte a imagens/vídeos
2. **Anti-Ban**: Machine learning para detecção
3. **Importação**: Suporte para Google Sheets direto
4. **Cache**: Configuração de duração customizável
5. **Notificações**: Prioridade customizável
6. **Agendamentos**: Recorrência (diária, semanal)

### Feedback
Para sugestões e melhorias, abra uma issue no repositório.

---

## 📝 Licença

Mesma licença do projeto principal.
