import type { HelpSection } from '../types';

const help: HelpSection[] = [
  {
    id: 'getting-started',
    title: 'Primeiros passos',
    blocks: [
      {
        p: 'O Cognatio gere a sua árvore genealógica: pessoas, as suas relações, acontecimentos de vida, fotos e documentos. Escolha uma área à esquerda e pesquise pessoas na parte superior. O botão ? no canto superior direito abre a ajuda da página em que se encontra.',
      },
      {
        steps: [
          'Em «Pessoas», clique em «Nova pessoa», introduza pelo menos o nome próprio e guarde.',
          'Na página da pessoa, adicione pais, filhos, parceiros ou irmãos no separador «Relações» – escolha uma pessoa existente ou crie uma nova ali mesmo.',
          'Veja o resultado em «Árvore genealógica». Com uma pessoa central, a árvore mostra a família do ponto de vista dessa pessoa.',
        ],
      },
      {
        p: 'A página inicial mostra o número de pessoas e a distribuição por sexo, acessos rápidos às áreas principais, as pessoas adicionadas mais recentemente e algumas dicas. A ajuda tem o seu próprio campo de pesquisa acima dos capítulos. O cartão «Aniversários» mostra os aniversários de nascimento, de falecimento e de casamento dos próximos 30 dias – para datas com dia, mês e ano; um aniversário de casamento é o início de uma relação marido/mulher.',
      },
      {
        p: 'Árvore de exemplo: no primeiro arranque, a aplicação de ambiente de trabalho cria a árvore genealógica «Familie Kraft (Demo)» – dez pessoas fictícias em quatro gerações, com relações, eventos de vida, notas e fotografias, para experimentar logo cada área. O conteúdo está em alemão. Para começar com os seus dados, crie uma nova árvore genealógica em «Árvores genealógicas» e elimine o exemplo (vai para a reciclagem e não volta). O ficheiro Cognatio-Demo-Familie-Kraft.zip está na pasta do programa (pasta «demo» em «resources») e na pasta «demo» do projeto; em Importar/Exportar pode importá-lo de novo como uma nova árvore genealógica.',
      },
    ],
    link: { to: '/persons', label: 'Ir para pessoas' },
  },
  {
    id: 'persons',
    title: 'Pessoas',
    blocks: [
      {
        p: 'Só o nome próprio é obrigatório. Se for desconhecido, assinale «Nome próprio desconhecido» – a aplicação mostra então «(nome desconhecido)». Introduza as datas na medida em que as conhece: 04.01.1880 (exata), 01.1880 (mês), 1880 (ano), «cerca de 1880», «antes de 1880», «depois de 1880» ou o intervalo «1880-1885». A aplicação deteta sozinha a precisão. Uma data por extenso, como «2 de outubro de 1880», passa a «02.10.1880».',
      },
      {
        p: 'Ao criar uma pessoa, a aplicação assinala as pessoas existentes com um nome semelhante e o mesmo ano de nascimento – para que não sejam criados duplicados. Os campos de local – nascimento, falecimento e acontecimentos – sugerem durante a escrita os locais que já existem na árvore genealógica; continua a ser possível introduzir qualquer outro local.',
      },
      {
        list: [
          'Resumo: dados pessoais, contacto e outros dados; «Editar» altera-os.',
          'Cronologia: acontecimentos como nascimento, batismo, casamento ou mudança de casa, com data e local. Um acontecimento pode ser associado a ficheiros – incluindo ficheiros de outras pessoas, p. ex. uma fotografia de grupo. Os acontecimentos podem ser ordenados do mais antigo para o mais recente ou ao contrário e mostrados como cronologia ou como tabela; a escolha é memorizada.',
          'Relações: ver a secção «Relações».',
          'Notas: texto livre, p. ex. histórias ou apontamentos de pesquisa, até 10 000 caracteres cada.',
          'Ficheiros: carregue fotografias e documentos (também vídeos, sem limite de tamanho por ficheiro); uma imagem pode ser definida como foto de perfil. O ícone de transferência guarda um ficheiro com o nome original. Um clique num ficheiro mostra-o numa janela própria com o nome como título – imagens, PDF, vídeos, áudio e ficheiros de texto (p. ex. TXT, Markdown, CSV); outros ficheiros, como ZIP, são guardados de imediato.',
          'Os ficheiros podem ser mostrados em mosaicos ou em lista (botões acima dos ficheiros).',
          'Fontes: as citações da pessoa, dos seus acontecimentos e das suas relações – ver a secção «Fontes e citações».',
          'Filtro: o campo junto aos separadores (exceto «Resumo») filtra as entradas do separador aberto – percurso de vida, relações, notas, ficheiros ou fontes. Maiúsculas e acentos não contam, com várias palavras todas têm de ocorrer, e os resultados ficam realçados. Pesquisa-se em todos os textos, p. ex. título, categoria, data, local, descrição e nomes de ficheiros. Nas relações, o gráfico mostra também apenas as pessoas restantes. O texto mantém-se ao mudar de separador; Esc ou o X apaga-o.',
        ],
      },
      { p: '«Eliminar» move a pessoa para a reciclagem – de onde pode ser restaurada.' },
    ],
    link: { to: '/persons', label: 'Ir para pessoas' },
  },
  {
    id: 'relations',
    title: 'Relações',
    blocks: [
      {
        p: 'Adiciona relações na página de uma pessoa, no separador «Relações», ou já ao criar a pessoa. O tipo de relação descreve a pessoa selecionada do ponto de vista da pessoa atual: se está na página da Ana e escolhe o Max como «Pai», o Max é o pai da Ana. O sentido contrário – a Ana é filha do Max – é mostrado automaticamente.',
      },
      {
        list: [
          'Tipos: mãe, pai, filho/a, irmão/irmã, marido, esposa, companheiro/a, parceiro/a, outro.',
          'Etiqueta (opcional), p. ex. «filho adotivo» ou «padrasto».',
          'Período de – até, p. ex. para um casamento; para um filho, a data de nascimento é sugerida como início.',
          'Se a pessoa ainda não existir, escolha «Nova pessoa» e crie-a diretamente na caixa de diálogo.',
          'Gráfico: ao lado da lista (por cima em ecrãs estreitos), as relações da pessoa são desenhadas como diagrama – pais em cima, parceiros ao lado, filhos em baixo. Um clique numa pessoa abre-a; o botão «Gráfico» oculta-o ou mostra-o e a escolha é memorizada.',
        ],
      },
      {
        p: 'Algumas relações são acrescentadas automaticamente: quando um progenitor e um filho são ligados, o parceiro do progenitor também passa a ser progenitor do filho (se o progenitor tiver exatamente um parceiro e o filho ainda não tiver um segundo progenitor; com vários parceiros, o segundo progenitor é acrescentado à mão; a relação começa no nascimento do filho, se for conhecido com exatidão) e os outros filhos do progenitor passam a ser irmãos do filho. O botão de eliminar junto de uma relação remove apenas a relação – as pessoas ficam.',
      },
    ],
  },
  {
    id: 'tree',
    title: 'Vista da árvore genealógica',
    blocks: [
      {
        list: [
          'Árvore genealógica: todas as famílias da árvore.',
          'Gráfico de ascendentes: pais, avós, etc. da pessoa central.',
          'Gráfico de descendentes: filhos, netos, etc. da pessoa central.',
          'Rede de relações: todas as ligações sob a forma de rede.',
        ],
      },
      {
        p: 'A pessoa central determina a partir de quem a árvore é desenhada; «Gerações» limita a profundidade. Pode ampliar e reduzir com a roda do rato ou a barra de zoom; um clique numa pessoa abre a respetiva página. A cor da borda indica o sexo. As árvores muito grandes (a partir de 400 pessoas) não são desenhadas automaticamente – escolha então uma pessoa central e menos gerações.',
      },
      {
        p: '«Exportar» guarda a árvore como PNG ou SVG ou imprime-a (também como PDF), à escolha apenas a área visível. A aplicação memoriza a vista, as gerações e a pessoa central; os valores predefinidos definem-se em «Definições». Na página de uma pessoa, «Mostrar árvore» abre a árvore com essa pessoa como pessoa central.',
      },
    ],
    link: { to: '/tree', label: 'Ir para a árvore genealógica' },
  },
  {
    id: 'sources',
    title: 'Fontes e citações',
    blocks: [
      {
        p: 'Uma fonte é um documento ou obra de onde vêm os dados – um livro paroquial, um registo civil, um recenseamento, uma carta, uma lápide, um sítio web ou uma entrevista. Uma citação é um assento nela: página ou número do assento, data, o assento palavra por palavra, a sua fiabilidade e digitalizações. Uma citação pode comprovar qualquer número de factos, p. ex. um assento de casamento o noivo, a noiva, os pais, as testemunhas, a boda e o casamento.',
      },
      {
        p: 'Fontes, arquivos e citações formam uma coleção para todas as árvores: uma conservatória ou um livro paroquial cria-se uma vez, e uma citação pode comprovar factos de pessoas em várias árvores. Uma alteração a uma fonte aplica-se em todo o lado.',
      },
      {
        list: [
          'Na página de uma pessoa, o separador «Fontes» mostra as citações da pessoa, dos seus acontecimentos e das suas relações, agrupadas por facto. «Citar fonte» escolhe o facto, uma fonte (ou cria uma) e uma citação dela já existente ou uma nova. Um pequeno livro ao lado do nome, do nascimento, do óbito, de um acontecimento ou de uma relação mostra quantas citações tem; um clique abre o separador.',
          '«Fontes» na barra lateral mostra as fontes usadas pela árvore aberta e as que não são usadas em lado nenhum; «Todas as árvores» mostra a coleção inteira. A página de uma fonte mostra os campos, as digitalizações e as citações com os factos que cada uma comprova, por pessoa e com os anos de vida; o × de um facto remove a ligação; «Ligar factos» liga uma citação a outras pessoas, uma após outra.',
          'Os arquivos (conservatória, arquivo paroquial, biblioteca, sítio web) gerem-se no segundo separador e escolhem-se em cada fonte; também se pode criar um novo diretamente no formulário de uma fonte.',
          'A fiabilidade segue os níveis do GEDCOM: fonte primária (o assento original), fonte secundária (escrita mais tarde), duvidosa (p. ex. tradição oral), pouco fiável ou estimada.',
          'As digitalizações pertencem à fonte inteira (folha de rosto, lápide) ou a uma citação (a página concreta).',
          'A pesquisa no topo também encontra fontes – por título, autor, arquivo, cota e as transcrições das suas citações; aparecem por cima das pessoas encontradas. As estatísticas mostram quantas pessoas têm uma citação e que fontes são mais citadas.',
          'GEDCOM: a exportação escreve os arquivos e as fontes como registos REPO e SOUR e cada citação junto dos factos que comprova (página, data, transcrição, fiabilidade, digitalizações no GEDZIP); a importação também recolhe as fontes de outros programas – também sob nomes, acontecimentos e famílias – e volta a juntar as citações iguais numa só.',
        ],
      },
      {
        p: 'Eliminar uma fonte move-a para a reciclagem com as suas citações: desaparecem de todos os factos e voltam com o restauro. Um arquivo na reciclagem deixa as suas fontes sem arquivo até ser restaurado. A eliminação definitiva de uma pessoa, de um acontecimento, de uma relação ou de uma árvore retira apenas as suas ligações; as fontes ficam.',
      },
      {
        p: 'A exportação de uma árvore contém as fontes, os arquivos e as citações que as suas pessoas usam, com as digitalizações; uma importação reutiliza uma fonte que já existe em vez de a copiar. A transcrição de uma citação pode nomear pessoas de outra árvore – vai com a exportação. Um ficheiro de exportação com fontes só pode ser lido por esta versão do Cognatio ou por uma mais recente.',
      },
    ],
    link: { to: '/sources', label: 'Ir para as fontes' },
  },
  {
    id: 'search',
    title: 'Pesquisa',
    blocks: [
      {
        p: 'O campo de pesquisa na parte superior pesquisa a árvore genealógica aberta: nomes – incluindo grafias semelhantes, pelo que «Meier» também encontra «Mayer» e «Maier» –, dados pessoais como locais e profissões, a cronologia e as notas. Cada resultado indica por onde foi encontrado. Os nomes escritos em cirílico contam como a sua grafia latina: «Иванов» também encontra «Iwanow» e «Ivanov». Também encontra fontes, que aparecem acima das pessoas encontradas (ver «Fontes e citações»).',
      },
    ],
  },
  {
    id: 'statistics',
    title: 'Estatísticas',
    blocks: [
      {
        p: 'As estatísticas analisam a árvore genealógica aberta (sem a reciclagem), distribuídas por separadores: «Visão geral» com números-chave como o número de pessoas, os sexos e a duração média de vida, «Vidas» com a distribuição por idade, «Nomes e lugares» com os apelidos e locais de nascimento mais frequentes, «Antepassados» com o resumo das gerações e «Fontes» com as fontes usadas, as pessoas com pelo menos uma citação e as fontes mais citadas.',
      },
      {
        p: 'Cada número que conta pessoas é uma ligação: um clique num número-chave, numa barra ou numa geração abre a lista de pessoas com exatamente essas pessoas. Acima da lista indica-se de que seleção vêm; o × volta a mostrar todas as pessoas, «Voltar às estatísticas» regressa. Uma pesquisa no topo procura então só entre essas pessoas.',
      },
      {
        p: 'Acima dos separadores escolhe-se o âmbito: toda a árvore, os antepassados ou os descendentes de uma pessoa (incluindo a própria) ou todas as pessoas de um apelido (também como apelido de nascimento) – se desejado, só as nascidas em certos anos. Todos os números e listas seguem-no; só as fontes se referem sempre a toda a árvore. O último âmbito escolhido é mantido para cada árvore.',
      },
      {
        p: '«O que ainda falta?» na visão geral mostra, para a data e o local de nascimento, a data e o local de morte (dos falecidos), o pai, a mãe, o parceiro (dos falecidos a partir dos 18), a foto e a fonte, em quantas pessoas o dado está registado; o estado da pesquisa é a média dessas proporções. Um clique nos que faltam abre a lista de pessoas em que ainda há algo a fazer.',
      },
      {
        p: '«Antepassados» mostra por geração quantos dos antepassados possíveis (2 pais, 4 avós, 8 bisavós …) foram encontrados, quem aparece mais de uma vez (perda de antepassados) e as pontas soltas – antepassados a quem ainda falta o pai ou a mãe. A análise começa na pessoa principal da árvore, definida com «Pessoa principal» na página de uma pessoa; os relatórios e a árvore também começam por ela.',
      },
      {
        p: 'A linha do tempo na visão geral mostra nascimentos, mortes ou casamentos por década; as décadas vazias ficam, para que as lacunas da pesquisa se notem. Os casamentos são o início de um matrimónio (relação marido/esposa) ou o acontecimento «casamento», uma vez por casal e ano; companheiros e parceiros só contam com esse acontecimento.',
      },
      {
        p: '«As vidas ao longo do tempo», em «Vidas», mostra por século de nascimento, separadamente para homens e mulheres, a duração média da vida – também só de quem chegou aos 15 –, a idade no primeiro casamento e ao nascimento do primeiro filho; entre parênteses, em quantas pessoas o valor se baseia, e uma média de menos de 5 pessoas não é mostrada. Além disso, o número de filhos por casal e a diferença de idade do casal.',
      },
      {
        p: '«Nomes e lugares» mostra também os nomes mais frequentes de homens e mulheres – cada nome conta, portanto «Johann Georg» para Johann e para Georg – e a moda dos nomes por século. «Migração» mostra quem morreu no local de nascimento, os caminhos mais frequentes do local de nascimento, passando pelas mudanças, até ao local de morte, e os lugares com as suas pessoas e o período dos dados lá.',
      },
      {
        p: '«Recordes», em «Vidas», indica a vida mais longa, o casamento mais longo, o maior número de filhos, parceiros e descendentes, os pais mais novos e mais velhos num nascimento e a maior diferença de idade de um casal – só de pessoas falecidas. Se um recorde for também um possível erro, como uma mãe de 61 anos, aparece um aviso com ligação.',
      },
      {
        p: '«Imprimir ou guardar como PDF» abre o relatório «Estatísticas» com todos os números do âmbito escolhido em tabelas. «Copiar como CSV» em cada cartão coloca os seus números na área de transferência, para colar numa folha de cálculo. Os assistentes de IA obtêm os mesmos números com a ferramenta «get_statistics», também para um âmbito.',
      },
    ],
    link: { to: '/statistics', label: 'Ir para as estatísticas' },
  },
  {
    id: 'checks',
    title: 'Possíveis erros',
    blocks: [
      {
        p: '«Possíveis erros» lista os dados da árvore aberta que são permitidos, mas raramente verdadeiros – muitas vezes um erro de escrita: um homem registado como mãe ou uma mulher como marido, parceiros que também são progenitor e filho ou irmãos, um filho com mais de dois progenitores, um progenitor com menos de 12 anos ou uma mãe com mais de 55 no nascimento, um progenitor que morreu antes do nascimento, uma união que começa antes do nascimento ou depois da morte de um parceiro, uma morte antes do nascimento, uma vida de mais de 110 anos ou uma pessoa com mais de 110 anos sem data de óbito, eventos antes do nascimento ou depois da morte, possíveis duplicados e pessoas que são os seus próprios antepassados. Uma data aproximada como «cerca de 1880» conta cinco anos para cada lado – só é indicado o que de certeza não bate certo.',
      },
      {
        p: 'Cada entrada indica as pessoas com uma ligação para elas. Corrija o erro aí – a entrada desaparece sozinha – ou clique em «Está correto» se o dado estiver certo: a entrada fica oculta, também depois de uma cópia de segurança e restauro. «Mostrar também os marcados como corretos» volta a mostrá-las.',
      },
      {
        p: 'Ao guardar uma relação que parece errada, a aplicação indica o motivo e pergunta se quer guardá-la mesmo assim. Os assistentes de IA também têm de lhe perguntar antes de guardar uma relação assim.',
      },
    ],
    link: { to: '/checks', label: 'Ir para os possíveis erros' },
  },
  {
    id: 'reports',
    title: 'Relatórios',
    blocks: [
      {
        p: 'Em «Relatórios» os dados da árvore genealógica aberta podem ser impressos ou guardados em PDF: a folha de pessoa (todos os dados de uma pessoa com familiares, acontecimentos, notas, fotografias e as fontes como notas de rodapé – também para todas as pessoas de uma vez), a folha de família (um casal com casamento, pais e filhos), a lista de antepassados com números de Kekulé (pai de n = 2n, mãe = 2n + 1; um antepassado que aparece duas vezes remete para o primeiro número) e a lista de descendentes com números d’Aboville (1, 1.1, 1.1.2 …). O botão «Relatório» na página de uma pessoa abre os relatórios com essa pessoa como início.',
      },
      {
        p: 'Acima da pré-visualização escolhe fotografias, notas, fontes, contactos e se as pessoas vivas aparecem só com nome e ano de nascimento; a escolha fica memorizada. «Imprimir» abre a janela de impressão. «Guardar como PDF» pede na aplicação de computador o nome do ficheiro e escreve o PDF; num navegador escolha «Guardar como PDF» como impressora na janela de impressão. Cada folha começa numa página nova e as páginas são numeradas.',
      },
    ],
    link: { to: '/reports', label: 'Ir para relatórios' },
  },
  {
    id: 'family-trees',
    title: 'Várias árvores genealógicas',
    blocks: [
      {
        p: 'Pode manter várias árvores genealógicas separadas, p. ex. a família paterna e a materna. Cada pessoa pertence a uma única árvore; todas as páginas mostram apenas a que está aberta. Muda-se com a seleção «Árvore genealógica aberta» na parte superior da barra lateral.',
      },
      {
        p: 'Na página «Árvores genealógicas» cria, muda o nome, abre ou elimina árvores. Uma árvore eliminada vai para a reciclagem com todos os seus dados; também é possível eliminar a última – a aplicação propõe então criar uma nova, importar um ficheiro ou recuperar uma árvore da reciclagem.',
      },
    ],
    link: { to: '/family-trees', label: 'Ir para as árvores genealógicas' },
  },
  {
    id: 'import-export',
    title: 'Importar/Exportar',
    blocks: [
      {
        p: 'A exportação e a importação aplicam-se à árvore genealógica aberta. A exportação ZIP contém todos os dados e ficheiros – para uma cópia de segurança ou para outra instalação do Cognatio. O GEDCOM (5.5.1 ou 7.0) é o formato de intercâmbio de outros programas de genealogia como Ancestry, MyHeritage ou Gramps, se desejado com imagens e documentos. Os ficheiros podem ter qualquer tamanho, também acima de 4 GB; em «Definições → Dados e cópia de segurança» é possível definir um limite máximo.',
      },
      {
        steps: [
          'Escolha um ficheiro (ZIP desta aplicação ou GEDCOM).',
          'Escolha o destino: a árvore aberta ou uma nova. Para ficheiros GEDCOM, a aplicação sugere uma nova árvore.',
          'A pré-visualização mostra o que vai mudar. Na árvore aberta, escolha como proceder.',
          '«Executar importação».',
        ],
      },
      {
        list: [
          'Combinar – prevalece o mais recente: as novas pessoas são adicionadas; onde os dados diferem, vale a versão mais recente.',
          'Combinar – decidir manualmente: como acima, mas onde os dados diferem decide por cada pessoa.',
          'Substituir: a árvore aberta é totalmente substituída pelo ficheiro; as outras árvores ficam inalteradas.',
        ],
      },
      {
        p: 'Quando um ficheiro GEDCOM é importado novamente, a aplicação reconhece as pessoas existentes e não as cria duas vezes. O histórico de importações mostra as importações anteriores. Se, após a importação, alguém fosse o seu próprio antepassado (um ciclo nas relações de pais e filhos), a pré-visualização indica as pessoas; a importação é feita mesmo assim e as relações corrigem-se depois manualmente.',
      },
    ],
    link: { to: '/import-export', label: 'Ir para Importar/Exportar' },
  },
  {
    id: 'backup',
    title: 'Cópia de segurança',
    blocks: [
      {
        p: 'O servidor faz automaticamente cópias de segurança da base de dados e dos ficheiros, por predefinição todos os dias. As definições mostram a última cópia e avisam se tiver mais de três dias.',
      },
      {
        p: 'Em «Definições → Cópia de segurança», «Transferir cópia de segurança» transfere um ficheiro com todas as árvores genealógicas, ficheiros, a reciclagem e o histórico de importações. As árvores individuais guardam-se através de «Importar/Exportar». Se em «Limites de tamanho» estiver definido um limite máximo, uma cópia de segurança maior é guardada na mesma, mas só pode ser restaurada depois de aumentar o limite.',
      },
      {
        steps: [
          'Escolha «Restaurar cópia de segurança…» e selecione o ficheiro de cópia – é verificado primeiro, ainda nada muda.',
          'Verifique a comparação «Agora / Na cópia».',
          'Escreva «ELIMINAR» para confirmar e escolha «Restaurar».',
        ],
      },
      {
        p: 'Todos os dados atuais são substituídos pela cópia de segurança. Antes disso, o servidor guarda o estado atual num ficheiro «cognatio_before_restore_…zip» – com ele é possível anular a restauração. Os três últimos destes ficheiros são mantidos; o servidor elimina os mais antigos.',
      },
      {
        p: 'Tamanho: a exportação, a importação, a cópia de segurança e o restauro leem e escrevem os ficheiros por partes – mesmo os muito grandes (50 GB ou mais) quase não precisam de memória. Antes, a aplicação verifica se a unidade tem espaço livre suficiente; um restauro precisa de cerca do espaço da cópia de segurança mais o dos dados atuais, porque primeiro guarda por completo o estado atual. «Atividade» na barra lateral mostra o progresso destas operações e dos carregamentos de ficheiros, também se entretanto tiver aberto outra página, e lista as concluídas até a aplicação ser fechada; aí, a importação e o restauro podem ser cancelados até os dados serem substituídos. Em «Definições → Dados e cópia de segurança → Limites de tamanho» é possível definir um limite máximo (por predefinição, nenhum). As pens USB com FAT32 aceitam no máximo 4 GB por ficheiro – para cópias grandes escolha uma unidade com exFAT ou NTFS.',
      },
    ],
    link: { to: '/settings', label: 'Ir para as definições' },
  },
  {
    id: 'trash',
    title: 'Reciclagem',
    blocks: [
      {
        p: 'A reciclagem contém as pessoas eliminadas da árvore genealógica aberta e as árvores genealógicas eliminadas; o número na barra lateral indica quantos são. «Restaurar» traz-os de volta. «Eliminar definitivamente» remove também relações, acontecimentos, notas e ficheiros e só pode ser anulado com uma cópia de segurança. Por baixo, «Fontes e arquivos» lista as fontes e os arquivos eliminados; pertencem a todas as árvores genealógicas, e uma fonte leva consigo as suas citações – ao restaurá-la, voltam a todos os factos.',
      },
    ],
    link: { to: '/trash', label: 'Ir para a reciclagem' },
  },
  {
    id: 'settings',
    title: 'Definições',
    blocks: [
      {
        p: 'O idioma (que só se altera aqui), o esquema de cores e os valores predefinidos da árvore genealógica (vista, gerações, pessoa central por árvore) aplicam-se a este navegador. A cópia de segurança e o estado do sistema aplicam-se a toda a aplicação.',
      },
      {
        list: [
          'Aparência (os blocos «Tipo de letra e cores» e «Árvore: aparência»): tipo e tamanho de letra, cor de destaque, estilo, espessura e cor das linhas da árvore, tamanho e cantos dos cartões, fotografia, datas e fita preta de luto das pessoas falecidas nos cartões e cores da borda consoante o sexo – com pré-visualização em direto e «Repor predefinições».',
          'Árvore: comportamento: a vista, o número de gerações e a pessoa central com que a árvore abre.',
          'Dados e cópia de segurança: guardar e restaurar (ver «Cópia de segurança»).',
          'Assistentes de IA (MCP): se e o que os assistentes de IA podem fazer (ver «Assistentes de IA (MCP)»).',
          'Sistema (sempre visível): idioma (também «Igual ao sistema operativo»), esquema de cores, versão e estado do servidor e da base de dados, número de pessoas e ficheiros, nível de registo, o registo do servidor e do navegador com uma exportação para a análise de erros (não contém dados da árvore), as licenças e, na aplicação de ambiente de trabalho, as atualizações do programa (ver «Aplicação de ambiente de trabalho»).',
        ],
      },
      {
        p: 'Os blocos abrem-se e fecham-se com um clique («Expandir tudo» / «Recolher tudo»). O campo de pesquisa acima deles encontra uma definição, abre o seu bloco e salta para o campo. A aparência, o idioma e os valores predefinidos da árvore são guardados neste navegador ou nesta janela da aplicação.',
      },
    ],
    link: { to: '/settings', label: 'Ir para as definições' },
  },
  {
    id: 'ai-assistants',
    title: 'Assistentes de IA (MCP)',
    blocks: [
      {
        p: 'Assistentes de IA como o Claude (Claude Desktop, Claude Code) e outros programas que falam o Model Context Protocol (MCP) podem trabalhar com as suas árvores genealógicas: procurar pessoas, responder a perguntas como «Que antepassados vieram da Pomerânia?», apontar lacunas e – se o permitir – introduzir o que ditar ou o que diz um assento paroquial digitalizado.',
      },
      {
        p: 'Liga-se em Definições → «Assistentes de IA (MCP)». A aplicação mostra então o endereço e um token – o token só uma vez – com um comando pronto para o Claude Code e um bloco de configuração para outros programas. Os assistentes ligam-se apenas a este computador; o que leem é enviado ao fornecedor do modelo de IA que utiliza.',
      },
      {
        steps: [
          'Definições → «Assistentes de IA (MCP)»: assinale «Permitir assistentes de IA». Aparecem o endereço e o token – o token só agora.',
          'Copie «Comando para o Claude Code» e execute-o uma vez num terminal (claude mcp add --transport http cognatio …). Com «--scope user» depois de «--transport http» funciona em qualquer pasta.',
          'Inicie o Claude Code: «/mcp» mostra «cognatio» como ligado, com as suas ferramentas.',
          'Pergunte por palavras suas. Para alterações, assinale o nível da área (p. ex. «Escrever» em pessoas).',
        ],
      },
      {
        p: 'Pode, por exemplo, perguntar:',
      },
      {
        list: [
          'Quem são os antepassados de Anna Kraft até aos bisavós e quais vieram da Pomerânia?',
          'Que pessoas nasceram entre 1850 e 1900 em Leipzig? Há possíveis duplicados?',
          'Com «escrever»: «Adiciona um batismo de Anna Kraft a 2 de outubro de 1951 em Leipzig.» ou «Introduz este assento paroquial com a fonte.»',
          'Com as permissões para ficheiros: «Exporta a árvore como GEDCOM para a minha pasta Documentos.» ou «Adiciona a digitalização …\\taufschein.jpg ao batismo da Anna.»',
        ],
      },
      {
        list: [
          'Permissões por área: desligado, ler, escrever (criar, alterar, mover para a reciclagem – anulável na aplicação) e apagar (não anulável, p. ex. restaurar uma cópia de segurança). Depois de ligar, cada área fica em «ler»; antes de «escrever» ou «apagar» a aplicação pergunta.',
          'Árvores genealógicas: um assistente só vê as árvores assinaladas; as árvores novas são visíveis.',
          'Os ficheiros nunca passam pelo MCP: um assistente indica um ficheiro deste computador (na pasta pessoal, de dados ou de cópias de segurança), p. ex. uma digitalização a adicionar, um ficheiro a importar ou uma pasta para uma exportação.',
          'Cada alteração de um assistente aparece em «Atividade»; o registo tem o filtro «Só assistentes de IA (MCP)».',
          'Perdeu o token? «Novo token» substitui-o e o antigo deixa de funcionar. Desligar torna o token inválido de imediato.',
          'O endereço contém a porta da aplicação, que se mantém entre arranques. Se a aplicação de ambiente de trabalho teve de usar outra, a secção indica-o – o assistente precisa então do novo endereço.',
          'Um assistente nunca pode alterar sozinho as definições dos assistentes de IA.',
        ],
      },
      {
        faq: [
          { q: 'O assistente recebe «404» ou «MCP está desligado».', a: 'Assinale «Permitir assistentes de IA» nas definições.' },
          {
            q: 'O assistente recebe «401» ou «token em falta ou errado».',
            a: 'O token foi substituído ou o MCP foi desligado entretanto. Crie um novo token e adicione o servidor de novo («claude mcp remove cognatio» e depois o novo comando).',
          },
          {
            q: 'Falta uma ferramenta ou responde «NOT_ALLOWED».',
            a: 'A permissão da sua área é demasiado baixa – suba-a nas definições; no Claude Code, «/mcp» volta a listar as ferramentas.',
          },
          {
            q: 'O assistente não consegue ligar-se de todo.',
            a: 'O Cognatio tem de estar a correr. Se as definições indicarem que a porta mudou, adicione o servidor de novo com o novo endereço.',
          },
        ],
      },
    ],
    link: { to: '/settings', label: 'Ir para as definições' },
  },
  {
    id: 'desktop-app',
    title: 'Aplicação de ambiente de trabalho (Windows, Linux)',
    blocks: [
      {
        p: 'A aplicação de ambiente de trabalho mostra o Cognatio numa janela própria, sem navegador, Node nem base de dados para instalar. Inicia a sua própria base de dados em segundo plano e termina-a quando fecha a janela ou escolhe «Sair» no fim da barra lateral. Só corre uma instância de cada vez.',
      },
      {
        list: [
          'Windows: instale com o ficheiro de instalação (por utilizador, sem direitos de administrador) ou descompacte o ZIP portátil, que guarda todos os dados numa pasta «data» junto ao programa.',
          'Linux: o AppImage é um único ficheiro – torne-o executável e inicie-o, ele adiciona-se sozinho ao menu de aplicações. O pacote Debian instala-se com «sudo apt install ./Cognatio-….deb». Se foi instalado com «dpkg -i», «sudo apt --fix-broken install» acrescenta as bibliotecas em falta e conclui a configuração – caso contrário o Cognatio não arranca.',
          'Os seus dados estão em %APPDATA%\\Cognatio no Windows e em ~/.config/Cognatio no Linux, separados do programa: uma atualização ou desinstalação nunca os elimina. O desinstalador do Windows pergunta se os dados também devem ser eliminados – transfira antes uma cópia de segurança.',
          'Faça de vez em quando uma cópia de segurança (Definições → Cópia de segurança) e guarde-a noutro local. A aplicação também guarda automaticamente a sua base de dados antes de cada atualização e uma vez por dia.',
        ],
      },
      {
        p: 'Em Definições → Sistema → Atualizações do programa, o Cognatio procura uma versão nova cerca de uma vez por dia (o interruptor está aí; «Verificar agora» procura de imediato). Só é enviado o pedido do ficheiro de versão. Uma versão nova é transferida em segundo plano e instalada ao reiniciar; antes, a base de dados é guardada. «Também versões de teste (beta)» oferece versões antes da sua publicação; voltar às versões publicadas nunca instala uma mais antiga. O ZIP portátil e o pacote Debian não são atualizados pela aplicação – instale a versão nova por si.',
      },
    ],
    link: { to: '/settings', label: 'Ir para as definições' },
  },
  {
    id: 'versions',
    title: 'Histórico de versões',
    blocks: [{ p: 'O que mudou em cada versão, a mais recente primeiro. Um clique numa funcionalidade leva ao capítulo da ajuda correspondente.' }],
  },
  {
    id: 'faq',
    title: 'Perguntas frequentes',
    blocks: [
      {
        faq: [
          { q: 'Eliminei uma pessoa por engano.', a: 'Abra a reciclagem e escolha «Restaurar» na pessoa.' },
          { q: 'Só conheço uma data aproximadamente.', a: 'Introduza-a na medida em que a conhece, p. ex. «cerca de 1880», «antes de 1900» ou «1880-1885».' },
          {
            q: 'Como trago a minha árvore genealógica do Ancestry, MyHeritage ou de outro programa?',
            a: 'Exporte-a aí como ficheiro GEDCOM (.ged) e importe-a em «Importar/Exportar» como nova árvore genealógica.',
          },
          {
            q: 'Uma pessoa existe duas vezes.',
            a: 'Complete os dados e as relações em falta numa das duas e elimine a outra.',
          },
          {
            q: 'Posso usar a aplicação sem rato?',
            a: 'Sim: Tab e Shift+Tab mudam entre os elementos, Enter ou Espaço ativam-nos e Escape fecha as caixas de diálogo. Ao primeiro Tab aparece «Ir para o conteúdo».',
          },
          {
            q: 'Onde são guardados os meus dados?',
            a: 'No seu próprio computador. Na aplicação de ambiente de trabalho, na pasta %APPDATA%\\Cognatio (Windows) ou ~/.config/Cognatio (Linux), na variante portátil na pasta «data» junto ao programa; se executar o servidor por si, na respetiva base de dados e pasta de carregamentos. Só o idioma, o esquema de cores e as definições de vista ficam no navegador ou na janela da aplicação.',
          },
          {
            q: 'Como mudo os meus dados para outro computador?',
            a: 'Em Definições → Cópia de segurança escolha «Transferir cópia de segurança», copie o ficheiro para o outro computador, instale lá o Cognatio e escolha «Restaurar cópia de segurança…». Uma única árvore genealógica pode ser passada com a exportação e importação ZIP em «Importar/Exportar».',
          },
          {
            q: 'Como atualizo a aplicação?',
            a: 'A aplicação de ambiente de trabalho procura atualizações por si (Definições → Sistema → Atualizações do programa) e instala-as ao reiniciar. O ZIP portátil e o pacote Debian atualizam-se instalando a versão nova; os seus dados mantêm-se.',
          },
        ],
      },
    ],
  },
];

export default help;
