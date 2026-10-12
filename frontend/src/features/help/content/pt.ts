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
        p: 'A página inicial mostra o número de pessoas e a distribuição por sexo, acessos rápidos às áreas principais, as pessoas adicionadas mais recentemente e algumas dicas. A ajuda tem o seu próprio campo de pesquisa acima dos capítulos.',
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
        p: 'Só o nome próprio é obrigatório. Se for desconhecido, assinale «Nome próprio desconhecido» – a aplicação mostra então «(nome desconhecido)». Introduza as datas na medida em que as conhece: 04.01.1880 (exata), 01.1880 (mês), 1880 (ano), «cerca de 1880», «antes de 1880», «depois de 1880» ou o intervalo «1880-1885». A aplicação deteta sozinha a precisão.',
      },
      {
        p: 'Ao criar uma pessoa, a aplicação assinala as pessoas existentes com um nome semelhante e o mesmo ano de nascimento – para que não sejam criados duplicados.',
      },
      {
        list: [
          'Resumo: dados pessoais, contacto e outros dados; «Editar» altera-os.',
          'Cronologia: acontecimentos como nascimento, batismo, casamento ou mudança de casa, com data e local. Um acontecimento pode ser associado a ficheiros – incluindo ficheiros de outras pessoas, p. ex. uma fotografia de grupo. Os acontecimentos podem ser ordenados do mais antigo para o mais recente ou ao contrário e mostrados como cronologia ou como tabela; a escolha é memorizada.',
          'Relações: ver a secção «Relações».',
          'Notas: texto livre, p. ex. histórias ou fontes, até 10 000 caracteres cada.',
          'Ficheiros: carregue fotografias e documentos (até 50 MB por ficheiro); uma imagem pode ser definida como foto de perfil. O ícone de transferência guarda um ficheiro com o nome original.',
          'Os ficheiros podem ser mostrados em mosaicos ou em lista (botões acima dos ficheiros).',
          'Filtro: o campo junto aos separadores (exceto «Resumo») filtra as entradas do separador aberto – percurso de vida, relações, notas ou ficheiros. Maiúsculas e acentos não contam, com várias palavras todas têm de ocorrer, e os resultados ficam realçados. Pesquisa-se em todos os textos, p. ex. título, categoria, data, local, descrição e nomes de ficheiros. Nas relações, o gráfico mostra também apenas as pessoas restantes. O texto mantém-se ao mudar de separador; Esc ou o X apaga-o.',
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
        p: 'Algumas relações são acrescentadas automaticamente: quando um progenitor e um filho são ligados, o parceiro do progenitor também passa a ser progenitor do filho (enquanto o filho tiver menos de dois progenitores; a relação começa no nascimento do filho, se for conhecido com exatidão) e os outros filhos do progenitor passam a ser irmãos do filho. O botão de eliminar junto de uma relação remove apenas a relação – as pessoas ficam.',
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
    id: 'search',
    title: 'Pesquisa',
    blocks: [
      {
        p: 'O campo de pesquisa na parte superior pesquisa a árvore genealógica aberta: nomes – incluindo grafias semelhantes, pelo que «Meier» também encontra «Mayer» e «Maier» –, dados pessoais como locais e profissões, a cronologia e as notas. Cada resultado indica por onde foi encontrado.',
      },
    ],
  },
  {
    id: 'statistics',
    title: 'Estatísticas',
    blocks: [
      {
        p: 'As estatísticas avaliam a árvore genealógica aberta (sem a reciclagem): valores-chave como o número de pessoas, os sexos e a duração média de vida, a distribuição por idades, os apelidos mais frequentes, os locais de nascimento mais frequentes e um resumo das gerações.',
      },
    ],
    link: { to: '/statistics', label: 'Ir para as estatísticas' },
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
        p: 'A exportação e a importação aplicam-se à árvore genealógica aberta. A exportação ZIP contém todos os dados e ficheiros – para uma cópia de segurança ou para outra instalação do Cognatio. O GEDCOM (5.5.1 ou 7.0) é o formato de intercâmbio de outros programas de genealogia como Ancestry, MyHeritage ou Gramps, se desejado com imagens e documentos. Por predefinição, um ficheiro pode ter até 2 GB (alterável em «Definições → Dados e cópia de segurança»); se os ficheiros de uma árvore forem maiores, exporte sem ficheiros.',
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
        p: 'Quando um ficheiro GEDCOM é importado novamente, a aplicação reconhece as pessoas existentes e não as cria duas vezes. O histórico de importações mostra as importações anteriores.',
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
        p: 'Em «Definições → Cópia de segurança», «Transferir cópia de segurança» transfere um ficheiro com todas as árvores genealógicas, ficheiros, a reciclagem e o histórico de importações. As árvores individuais guardam-se através de «Importar/Exportar». Uma cópia de segurança que excede o limite de tamanho é guardada, mas esta aplicação não a consegue restaurar – guarde então também as árvores individuais através de «Importar/Exportar».',
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
        p: 'Limite de tamanho: a exportação, a importação, a cópia de segurança e o restauro processam um ficheiro na memória, por predefinição até 2 GB. Em «Definições → Dados e cópia de segurança → Limites de tamanho», um computador com muita memória pode permitir ficheiros maiores. Acima de 4 GB, tem de haver livre, no mínimo, o dobro do tamanho do ficheiro em memória (RAM); caso contrário, a aplicação pode ficar muito lenta ou parar; as definições avisam disso. Uma exportação demasiado grande é recusada; uma cópia de segurança demasiado grande é criada com um aviso.',
      },
    ],
    link: { to: '/settings', label: 'Ir para as definições' },
  },
  {
    id: 'trash',
    title: 'Reciclagem',
    blocks: [
      {
        p: 'A reciclagem contém as pessoas eliminadas da árvore genealógica aberta e as árvores genealógicas eliminadas; o número na barra lateral indica quantos são. «Restaurar» traz-os de volta. «Eliminar definitivamente» remove também relações, acontecimentos, notas e ficheiros e só pode ser anulado com uma cópia de segurança.',
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
