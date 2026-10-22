import type { ReleaseNotes } from '../releases';

const notes: ReleaseNotes = {
  '1.1.0': {
    mcp: {
      title: 'Assistentes de IA (MCP)',
      text: 'Assistentes de IA como o Claude podem consultar, pesquisar e – com a sua permissão – alterar as suas árvores genealógicas através do Model Context Protocol. Decide por área o que podem fazer; cada alteração aparece em «Atividade».',
    },
    reports: {
      title: 'Relatórios para imprimir e em PDF',
      text: 'Folha de pessoa, folha de família, lista de antepassados (Kekulé) e de descendentes (d’Aboville) – impressas ou em PDF, na aplicação de computador diretamente num ficheiro.',
    },
    checks: {
      title: 'Possíveis erros',
      text: 'Uma nova página lista o que é permitido mas raramente verdadeiro – um homem como mãe, uma mãe com 60 anos, um casamento depois da morte, possíveis duplicados e mais – com ligações para as pessoas; o que estiver certo pode ser marcado como tal. Uma relação que parece errada só é guardada depois de perguntar.',
    },
    statistics: {
      title: 'Estatísticas para continuar a pesquisa',
      text: 'Cada número das estatísticas leva às pessoas por trás dele – um clique numa barra abre a lista de pessoas com exatamente essas pessoas. Pode escolher-se o âmbito: antepassados ou descendentes de uma pessoa, um apelido, anos de nascimento. As análises estão distribuídas por separadores. «O que ainda falta?» mostra o estado da pesquisa e leva às lacunas; «Antepassados» mostra por geração quantos antepassados foram encontrados, a perda de antepassados e as pontas soltas – a partir da nova pessoa principal da árvore. Uma linha do tempo mostra nascimentos, mortes e casamentos por década; «As vidas ao longo do tempo» compara a duração da vida, a idade ao casar e ao primeiro filho ao longo dos séculos. Além disso, os nomes e a sua moda, a migração da família de lugar em lugar e os recordes dos falecidos. Tudo pode ser impresso como relatório, guardado como PDF ou copiado como CSV.',
    },
    places: {
      title: 'Sugestões de locais',
      text: 'Os campos local de nascimento, local de falecimento e local de um acontecimento sugerem os locais que já existem na árvore genealógica, os mais usados primeiro.',
    },
    dates: {
      title: 'Datas por extenso',
      text: 'Os campos de data também aceitam datas por extenso em qualquer idioma da aplicação, como «2 de outubro de 1951» ou «maio de 1951», e convertem-nas em «02.10.1951» e «05.1951».',
    },
    anniversaries: {
      title: 'Aniversários na página inicial',
      text: 'A página inicial mostra os aniversários de nascimento, de falecimento e de casamento dos próximos 30 dias, com a idade ou os anos passados.',
    },
    sources: {
      title: 'Fontes e citações',
      text: 'Uma coleção de fontes e arquivos para todas as árvores genealógicas: uma citação regista página, data, transcrição, fiabilidade e digitalizações e sustenta qualquer número de factos – nome, nascimento, óbito, acontecimentos e relações, também de várias pessoas. A página de uma fonte mostra por pessoa o que cada citação sustenta; o GEDCOM mantém as fontes de outros programas.',
    },
    files: {
      title: 'Ver ficheiros',
      text: 'Imagens, PDF, vídeos, áudio e ficheiros de texto como TXT, Markdown ou CSV abrem numa janela com o nome do ficheiro como título; os restantes ficheiros são guardados de imediato. Os ficheiros deixaram de ter limite de tamanho, cabem também vídeos longos. Um ficheiro cujo nome indica uma imagem ou um PDF que não o é é recusado.',
    },
    activity: {
      title: 'Grandes volumes de dados e «Atividade»',
      text: 'Exportação, importação, cópia de segurança e restauro lidam com 50 GB ou mais com pouca memória e verificam primeiro o espaço livre. «Atividade» na barra lateral mostra o progresso de cada operação longa; a importação e o restauro podem ser cancelados.',
    },
    search: {
      title: 'Nomes em cirílico',
      text: 'A pesquisa trata os nomes escritos em cirílico como a sua grafia latina: «Иванов» também encontra «Iwanow» e «Ivanov».',
    },
    'import-export': {
      title: 'Importação no teu idioma',
      text: 'Uma importação GEDCOM escreve os títulos dos acontecimentos, as designações e as datas aproximadas no idioma da interface. A importação e o restauro avisam quando alguém seria o seu próprio antepassado, e as notas muito longas são divididas em vez de ficarem bloqueadas. A exportação GEDCOM escreve batismos, profissões e residências com as etiquetas padrão que outros programas reconhecem.',
    },
    relations: {
      title: 'Relações derivadas mais claras',
      text: 'O parceiro de um progenitor só passa a segundo progenitor se este tiver exatamente um parceiro, e uma relação progenitor-filho é guardada com as relações derivadas por inteiro ou de todo não. Os irmãos que surgiram apenas de uma relação pai-filho eliminada vão com ela para a reciclagem e voltam com ela; a exportação GEDCOM omite as relações na reciclagem.',
    },
    'desktop-app': {
      title: 'PostgreSQL 18',
      text: 'A aplicação de ambiente de trabalho usa o PostgreSQL 18; os dados da versão 1.0.0 são convertidos automaticamente no primeiro arranque e a pasta antiga da base de dados é mantida durante 30 dias.',
    },
    settings: {
      title: 'Barra lateral por grupos',
      text: 'A barra lateral agrupa as áreas em «Registar», «Analisar» e «Gerir»; «Importar/Exportar» está agora em «Gerir» e «Possíveis erros» mostra quantos estão em aberto. «Atividade», «Reciclagem», «Definições» e «Ajuda» ficam em baixo.',
    },
  },
  '1.0.0': {
    persons: {
      title: 'Pessoas com eventos de vida e ficheiros',
      text: 'Pessoas com datas flexíveis (exata, mês, ano, «cerca de 1880» ou intervalo), eventos de vida com locais, notas, fotografias e documentos.',
    },
    relations: {
      title: 'Relações',
      text: 'Ligue pais, filhos, parceiros e irmãos. A relação inversa surge automaticamente; são possíveis períodos e designações como «filho adotivo».',
    },
    tree: {
      title: 'Vistas da árvore genealógica',
      text: 'Árvore genealógica, árvore de ascendentes, árvore de descendentes e rede de relações, com zoom, pessoa em foco e exportação para PNG, SVG ou PDF.',
    },
    search: {
      title: 'Pesquisa',
      text: 'Encontra nomes mesmo com grafias semelhantes, bem como locais, profissões, eventos de vida e notas.',
    },
    statistics: {
      title: 'Estatísticas',
      text: 'Números-chave, distribuição por idades, apelidos e locais de nascimento mais frequentes e uma visão geral das gerações.',
    },
    'family-trees': {
      title: 'Várias árvores genealógicas',
      text: 'Mantenha árvores separadas, por exemplo para os dois lados da família, e alterne entre elas.',
    },
    'import-export': {
      title: 'Importar e exportar',
      text: 'Troque dados em ZIP (com ficheiros) ou em GEDCOM 5.5.1 e 7.0 com outros programas de genealogia; importar de novo não cria duplicados.',
    },
    backup: {
      title: 'Cópias de segurança',
      text: 'Cópias automáticas diárias, transferência de todos os dados e uma restauração guiada que guarda primeiro o estado atual.',
    },
    trash: {
      title: 'Reciclagem',
      text: 'As pessoas e árvores eliminadas podem ser restauradas.',
    },
    settings: {
      title: 'Idiomas e aspeto',
      text: 'Dez idiomas (a aplicação arranca no idioma do sistema operativo), esquemas de cores, tipos de letra e o aspeto da árvore.',
    },
    'desktop-app': {
      title: 'Aplicação de ambiente de trabalho para Windows e Linux',
      text: 'Instalador do Windows ou ZIP portátil, AppImage ou pacote Debian para Linux: com base de dados própria, sem configuração, arranca com um clique, guarda os dados antes de cada atualização e atualiza-se sozinha (exceto o ZIP portátil e o pacote Debian).',
    },
  },
};

export default notes;
