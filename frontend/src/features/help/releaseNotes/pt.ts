import type { ReleaseNotes } from '../releases';

const notes: ReleaseNotes = {
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
