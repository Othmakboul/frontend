import React, { useState, useCallback, useEffect, useMemo } from 'react';
import {
    ReactFlow,
    Controls,
    Background,
    MiniMap,
    useNodesState,
    useEdgesState,
    useReactFlow,
    ReactFlowProvider
} from '@xyflow/react';
import '@xyflow/react/dist/style.css';
import dagre from 'dagre';
import { Search, Download } from 'lucide-react';

import api from '../lib/api';
import GraphCustomNode from '../components/GraphCustomNode';

const nodeTypes = {
    custom: GraphCustomNode,
};

// Dagre layout helper
const dagreGraph = new dagre.graphlib.Graph();
dagreGraph.setDefaultEdgeLabel(() => ({}));

const nodeWidth = 200;
const nodeHeight = 80;

const getLayoutedElements = (nodes, edges, direction = 'LR') => {
    dagreGraph.setGraph({ rankdir: direction, ranksep: 100, nodesep: 50 });

    nodes.forEach((node) => {
        dagreGraph.setNode(node.id, { width: nodeWidth, height: nodeHeight });
    });

    edges.forEach((edge) => {
        dagreGraph.setEdge(edge.source, edge.target);
    });

    dagre.layout(dagreGraph);

    const layoutedNodes = nodes.map((node) => {
        const nodeWithPosition = dagreGraph.node(node.id);
        return {
            ...node,
            position: {
                x: nodeWithPosition.x - nodeWidth / 2,
                y: nodeWithPosition.y - nodeHeight / 2,
            },
        };
    });

    return { nodes: layoutedNodes, edges };
};

const initialNodes = [
    {
        id: 'root',
        type: 'custom',
        data: { label: 'LISTIC', type: 'root', color: '#ef4444' },
        position: { x: 0, y: 0 },
    },
];

const initialEdges = [];

function NetworkGraphInner() {
    const [nodes, setNodes, onNodesChange] = useNodesState(initialNodes);
    const [edges, setEdges, onEdgesChange] = useEdgesState(initialEdges);
    
    const [loading, setLoading] = useState(false);
    const [expandedNodes, setExpandedNodes] = useState(new Set());
    const [info, setInfo] = useState("Click on the LISTIC node to start.");
    const [researcherCache, setResearcherCache] = useState({});
    
    const [searchQuery, setSearchQuery] = useState('');
    const [showSearchResults, setShowSearchResults] = useState(false);

    const { setCenter, fitView } = useReactFlow();

    // Center on initialization
    useEffect(() => {
        const { nodes: layoutedNodes } = getLayoutedElements(nodes, edges);
        setNodes(layoutedNodes);
        setTimeout(() => fitView({ padding: 0.2, duration: 800 }), 100);
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

    // Filter nodes based on search
    const searchResults = useMemo(() => {
        if (!searchQuery.trim()) return [];
        return nodes
            .filter(n => n.data.label.toLowerCase().includes(searchQuery.toLowerCase()))
            .slice(0, 10);
    }, [searchQuery, nodes]);

    const zoomToNode = useCallback((node) => {
        setCenter(node.position.x + nodeWidth / 2, node.position.y + nodeHeight / 2, {
            zoom: 1.5,
            duration: 800,
        });
        
        setShowSearchResults(false);
        setInfo(`Navigué vers: ${node.data.label}`);
        
        // Temporarily highlight node
        setNodes(nds => nds.map(n => ({
            ...n,
            selected: n.id === node.id
        })));
        
        
        setTimeout(() => {
            setNodes(nds => nds.map(n => ({ ...n, selected: false })));
        }, 3000);
    }, [setCenter, setNodes]);

    const exportGraphData = useCallback(() => {
        const exportData = {
            nodes: nodes.map(n => ({
                id: n.id,
                name: n.data.label,
                type: n.data.type,
                color: n.data.color,
                ...(n.data.raw ? { data: n.data.raw } : {})
            })),
            links: edges.map(e => ({
                source: e.source,
                target: e.target
            })),
            exportDate: new Date().toISOString(),
            totalNodes: nodes.length,
            totalEdges: edges.length
        };

        const blob = new Blob([JSON.stringify(exportData, null, 2)], { type: 'application/json' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `network-graph-${new Date().toISOString().slice(0, 10)}.json`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
        setInfo(`Graphe exporté: ${nodes.length} nœuds, ${edges.length} liens.`);
    }, [nodes, edges]);

    const applyLayout = useCallback((newNodes, newEdges) => {
        const layouted = getLayoutedElements(newNodes, newEdges);
        setNodes(layouted.nodes);
        setEdges(layouted.edges);
        // Fit view nicely after layout changes
        setTimeout(() => {
             fitView({ padding: 0.2, duration: 800 });
        }, 50);
    }, [setNodes, setEdges, fitView]);

    const addNodesAndLinks = useCallback((sourceNodeId, customNodesList) => {
        setNodes(prevNodes => {
            setEdges(prevEdges => {
                const existingNodeIds = new Set(prevNodes.map(n => n.id));
                const filteredNewNodes = customNodesList
                    .filter(n => !existingNodeIds.has(n.id))
                    .map(n => ({
                        id: n.id,
                        type: 'custom',
                        data: {
                            label: n.name,
                            subLabel: n.subLabel,
                            type: n.type,
                            color: n.color,
                            raw: n.data || n, 
                            ...n // store extra props
                        },
                        position: { x: 0, y: 0 }, // Dagre will position it
                    }));

                const newEdgesArray = filteredNewNodes.map(n => ({
                    id: `e-${sourceNodeId}-${n.id}`,
                    source: sourceNodeId,
                    target: n.id,
                    animated: true,
                    style: { stroke: n.data.color, strokeWidth: 2 }
                }));

                const finalNodes = [...prevNodes, ...filteredNewNodes];
                const finalEdges = [...prevEdges, ...newEdgesArray];
                
                applyLayout(finalNodes, finalEdges);
                return prevNodes; // We handle update in applyLayout, so this dummy return avoids react flow conflicts.
            });
            return prevNodes;
        });
    }, [applyLayout, setNodes, setEdges]);


    const removeNodeAndDescendants = useCallback((nodeId) => {
        setEdges(prevEdges => {
            setNodes(prevNodes => {
                const toRemove = new Set([nodeId]);
                let changed = true;
                while (changed) {
                    changed = false;
                    prevEdges.forEach(edge => {
                        if (toRemove.has(edge.source) && !toRemove.has(edge.target)) {
                            toRemove.add(edge.target);
                            changed = true;
                        }
                    });
                }
                toRemove.delete(nodeId); // Keep clicked node

                setExpandedNodes(prev => {
                    const next = new Set(prev);
                    toRemove.forEach(id => next.delete(id));
                    next.delete(nodeId);
                    return next;
                });

                const remainingNodes = prevNodes.filter(n => !toRemove.has(n.id));
                const remainingEdges = prevEdges.filter(e => !toRemove.has(e.source) && !toRemove.has(e.target));
                
                applyLayout(remainingNodes, remainingEdges);
                return prevNodes;
            });
            return prevEdges;
        });
    }, [applyLayout, setNodes, setEdges]);


    // Massive Node Click Handler ported from ForceGraph logic
    const handleNodeClick = useCallback(async (event, node) => {
        const id = node.id;
        const type = node.data.type;
        const name = node.data.label;

        // Toggle Expand/Collapse
        if (expandedNodes.has(id)) {
            removeNodeAndDescendants(id);
            setInfo(`Collapsed ${name}.`);
            return;
        }

        setExpandedNodes(prev => new Set(prev).add(id));
        const customData = node.data;

        try {
            // 1. Root
            if (type === 'root') {
                const newNodes = [
                    { id: 'group-researchers', name: 'Chercheurs', color: '#3b82f6', type: 'group_researchers' },
                    { id: 'group-projects', name: 'Projets', color: '#10b981', type: 'group_projects_global' }
                ];
                addNodesAndLinks(id, newNodes);
                setInfo("Expanded LISTIC. Choose Researchers or Projects.");
                return;
            }

            // 2. Global Projects
            if (type === 'group_projects_global') {
                setLoading(true);
                const res = await api.get('/projects');
                const projects = res.data;
                setResearcherCache(prev => ({ ...prev, allProjects: projects }));

                const newNodes = [
                    { id: 'proj-collaborators-hal', name: 'Collaborateurs (HAL)', color: '#ec4899', type: 'proj_collab_hal' },
                    { id: 'proj-partners', name: 'Partenaires', color: '#f59e0b', type: 'proj_partners_group' },
                    { id: 'proj-funders', name: 'Financeurs', color: '#8b5cf6', type: 'proj_funders_group' },
                    { id: 'proj-by-category', name: 'Par Catégorie', color: '#10b981', type: 'proj_by_category' }
                ];
                addNodesAndLinks(id, newNodes);
                setInfo("Choisissez: Collaborateurs HAL, Partenaires, Financeurs ou Par Catégorie.");
                setLoading(false);
                return;
            }

            // 2.1 Projects by Category
            if (type === 'proj_by_category') {
                const projects = researcherCache.allProjects || [];
                const types = [...new Set(projects.map(p => p.type || 'Autres'))];

                const newNodes = types.map(t => ({
                    id: `proj-type-${t}`, name: t, color: '#10b981', type: 'project_category', raw_type: t
                }));

                const cacheUpdate = {};
                projects.forEach(p => {
                    const t = p.type || 'Autres';
                    if (!cacheUpdate[t]) cacheUpdate[t] = [];
                    cacheUpdate[t].push(p);
                });
                setResearcherCache(prev => ({ ...prev, ...cacheUpdate }));
                addNodesAndLinks(id, newNodes);
                setInfo("Choisissez une catégorie de projet.");
                return;
            }

            // 2.2 Partners Group
            if (type === 'proj_partners_group') {
                const projects = researcherCache.allProjects || [];
                const partnerMap = {};
                projects.forEach(p => {
                    const partnersStr = p.PARTENAIRES || '';
                    if (!partnersStr.trim()) return;
                    const partners = partnersStr.split(',').map(s => s.trim()).filter(Boolean);
                    partners.forEach(partner => {
                        if (!partnerMap[partner]) partnerMap[partner] = [];
                        partnerMap[partner].push(p);
                    });
                });
                setResearcherCache(prev => ({ ...prev, partnerProjects: partnerMap }));

                const newNodes = Object.keys(partnerMap).slice(0, 30).map(partner => ({
                    id: `partner-${partner.replace(/\s+/g, '_')}`, name: partner, color: '#fbbf24', type: 'item_partner', partnerName: partner
                }));
                addNodesAndLinks(id, newNodes);
                setInfo(`${Object.keys(partnerMap).length} partenaires trouvés.`);
                return;
            }

            // 2.3 Partner Item -> Projects
            if (type === 'item_partner') {
                const partnerName = customData.partnerName;
                const projects = (researcherCache.partnerProjects || {})[partnerName] || [];
                const newNodes = projects.map(p => ({
                    id: `partner-proj-${p._unique_id}`, name: p.NOM, subLabel: 'Project', color: '#fcd34d', type: 'item_project_leaf', data: p
                }));
                addNodesAndLinks(id, newNodes);
                setInfo(`${projects.length} projets avec ${partnerName}.`);
                return;
            }

            if (type === 'proj_funders_group') {
                 const projects = researcherCache.allProjects || [];
                 const funderMap = {};
                 projects.forEach(p => {
                     const fundersStr = p.FINANCEURS || '';
                     if (!fundersStr.trim()) return;
                     const funders = fundersStr.split(',').map(s => s.trim()).filter(Boolean);
                     funders.forEach(funder => {
                         if (!funderMap[funder]) funderMap[funder] = [];
                         funderMap[funder].push(p);
                     });
                 });
                 setResearcherCache(prev => ({ ...prev, funderProjects: funderMap }));
 
                 const newNodes = Object.keys(funderMap).slice(0, 30).map(funder => ({
                     id: `funder-${funder.replace(/\s+/g, '_')}`, name: funder, color: '#a78bfa', type: 'item_funder', funderName: funder
                 }));
                 addNodesAndLinks(id, newNodes);
                 setInfo(`${Object.keys(funderMap).length} financeurs trouvés.`);
                 return;
             }
 
             if (type === 'item_funder') {
                 const funderName = customData.funderName;
                 const projects = (researcherCache.funderProjects || {})[funderName] || [];
                 const newNodes = projects.map(p => ({
                     id: `funder-proj-${p._unique_id}`, name: p.NOM, subLabel: 'Project', color: '#c4b5fd', type: 'item_project_leaf', data: p
                 }));
                 addNodesAndLinks(id, newNodes);
                 setInfo(`${projects.length} projets financés par ${funderName}.`);
                 return;
             }

            // 2.6 Collaborators HAL (Global)
            if (type === 'proj_collab_hal') {
                setLoading(true);
                setInfo("Chargement des collaborateurs depuis HAL...");
                try {
                    const halUrl = `https://api.archives-ouvertes.fr/search/?q=structAcronym_s:"LISTIC"&wt=json&rows=0&facet=true&facet.field=authFullName_s&facet.limit=30&facet.mincount=5`;
                    const response = await fetch(halUrl);
                    const data = await response.json();
                    const authorFacet = data.facet_counts?.facet_fields?.authFullName_s || [];
                    const collaborators = [];
                    for (let i = 0; i < authorFacet.length; i += 2) {
                        collaborators.push({ name: authorFacet[i], count: authorFacet[i + 1] });
                    }
                    const newNodes = collaborators.map(c => ({
                        id: `hal-collab-${c.name.replace(/\s+/g, '_')}`, name: c.name, subLabel: `Docs: ${c.count}`, color: '#f9a8d4', type: 'item_collab', collabName: c.name
                    }));
                    addNodesAndLinks(id, newNodes);
                    setInfo(`${collaborators.length} collaborateurs HAL trouvés.`);
                } catch (e) {
                    console.error(e);
                    setInfo("Erreur de chargement HAL.");
                } finally {
                    setLoading(false);
                }
                return;
            }

            // Category Expand
            if (type === 'project_category') {
                const categoryName = customData.raw_type;
                const catProjects = researcherCache[categoryName] || [];
                setResearcherCache(prev => ({ ...prev, [`cat-projects-${categoryName}`]: catProjects }));

                const newNodes = [
                    { id: `cat-${categoryName}-collab-hal`, name: 'Collaborateurs (HAL)', color: '#ec4899', type: 'cat_collab_hal', categoryName },
                    { id: `cat-${categoryName}-partners`, name: 'Partenaires', color: '#f59e0b', type: 'cat_partners', categoryName },
                    { id: `cat-${categoryName}-funders`, name: 'Financeurs', color: '#8b5cf6', type: 'cat_funders', categoryName },
                    { id: `cat-${categoryName}-projects-list`, name: 'Liste des Projets', color: '#34d399', type: 'cat_projects_list', categoryName }
                ];
                addNodesAndLinks(id, newNodes);
                setInfo(`Catégorie ${name}: Choisissez une vue.`);
                return;
            }

            if (type === 'cat_projects_list') {
                const catProjects = researcherCache[`cat-projects-${customData.categoryName}`] || [];
                const newNodes = catProjects.map(p => ({
                    id: p._unique_id || `proj-${p.NOM}`, name: p.NOM, color: '#34d399', type: 'item_project_global', data: p
                }));
                addNodesAndLinks(id, newNodes);
                setInfo(`${catProjects.length} projets ${customData.categoryName}.`);
                return;
            }

            if (type === 'cat_partners') {
                const catProjects = researcherCache[`cat-projects-${customData.categoryName}`] || [];
                const partnerMap = {};
                catProjects.forEach(p => {
                    const partnersStr = p.PARTENAIRES || '';
                    if (!partnersStr.trim()) return;
                    const partners = partnersStr.split(',').map(s => s.trim()).filter(Boolean);
                    partners.forEach(partner => {
                        if (!partnerMap[partner]) partnerMap[partner] = [];
                        partnerMap[partner].push(p);
                    });
                });
                setResearcherCache(prev => ({ ...prev, [`cat-partner-projects-${customData.categoryName}`]: partnerMap }));
                const newNodes = Object.keys(partnerMap).map(partner => ({
                    id: `cat-partner-${customData.categoryName}-${partner.replace(/\s+/g, '_')}`, name: partner, color: '#fbbf24', type: 'cat_item_partner', partnerName: partner, categoryName: customData.categoryName
                }));
                addNodesAndLinks(id, newNodes);
                setInfo(`${Object.keys(partnerMap).length} partenaires pour ${customData.categoryName}.`);
                return;
            }

            if (type === 'cat_item_partner') {
                const partnerMap = researcherCache[`cat-partner-projects-${customData.categoryName}`] || {};
                const projects = partnerMap[customData.partnerName] || [];
                const newNodes = projects.map(p => ({
                    id: `cat-partner-proj-${customData.categoryName}-${p._unique_id}`, name: p.NOM, color: '#fcd34d', type: 'item_project_leaf', data: p
                }));
                addNodesAndLinks(id, newNodes);
                setInfo(`${projects.length} projets avec ${customData.partnerName}.`);
                return;
            }

            if (type === 'cat_funders') {
                 const catProjects = researcherCache[`cat-projects-${customData.categoryName}`] || [];
                 const funderMap = {};
                 catProjects.forEach(p => {
                     const fundersStr = p.FINANCEURS || '';
                     if (!fundersStr.trim()) return;
                     const funders = fundersStr.split(',').map(s => s.trim()).filter(Boolean);
                     funders.forEach(funder => {
                         if (!funderMap[funder]) funderMap[funder] = [];
                         funderMap[funder].push(p);
                     });
                 });
                 setResearcherCache(prev => ({ ...prev, [`cat-funder-projects-${customData.categoryName}`]: funderMap }));
                 const newNodes = Object.keys(funderMap).map(funder => ({
                     id: `cat-funder-${customData.categoryName}-${funder.replace(/\s+/g, '_')}`, name: funder, color: '#a78bfa', type: 'cat_item_funder', funderName: funder, categoryName: customData.categoryName
                 }));
                 addNodesAndLinks(id, newNodes);
                 setInfo(`${Object.keys(funderMap).length} financeurs pour ${customData.categoryName}.`);
                 return;
            }
 
            if (type === 'cat_item_funder') {
                 const funderMap = researcherCache[`cat-funder-projects-${customData.categoryName}`] || {};
                 const projects = funderMap[customData.funderName] || [];
                 const newNodes = projects.map(p => ({
                     id: `cat-funder-proj-${customData.categoryName}-${p._unique_id}`, name: p.NOM, color: '#c4b5fd', type: 'item_project_leaf', data: p
                 }));
                 addNodesAndLinks(id, newNodes);
                 setInfo(`${projects.length} projets avec ${customData.funderName}.`);
                 return;
            }

            if (type === 'cat_collab_hal') {
                const catProjects = researcherCache[`cat-projects-${customData.categoryName}`] || [];
                if (catProjects.length === 0) {
                    setInfo("Aucun projet dans cette catégorie."); return;
                }
                setLoading(true);
                try {
                    const projectNames = catProjects.map(p => p.NOM).join('" OR "');
                    const halUrl = `https://api.archives-ouvertes.fr/search/?q=text:("${encodeURIComponent(projectNames)}")&wt=json&rows=0&facet=true&facet.field=authFullName_s&facet.limit=30&facet.mincount=1`;
                    const response = await fetch(halUrl);
                    const data = await response.json();
                    const authorFacet = data.facet_counts?.facet_fields?.authFullName_s || [];
                    const collaborators = [];
                    for (let i = 0; i < authorFacet.length; i += 2) {
                        collaborators.push({ name: authorFacet[i], count: authorFacet[i + 1] });
                    }
                    const newNodes = collaborators.map(c => ({
                        id: `cat-hal-collab-${customData.categoryName}-${c.name.replace(/\s+/g, '_')}`, name: c.name, subLabel: `Docs: ${c.count}`, color: '#f9a8d4', type: 'item_collab', collabName: c.name
                    }));
                    addNodesAndLinks(id, newNodes);
                    setInfo(`${collaborators.length} collaborateurs HAL trouvés.`);
                } catch (e) {
                    console.error(e);
                    setInfo("Erreur de chargement HAL.");
                } finally {
                    setLoading(false);
                }
                return;
            }

            // Researchers
            if (type === 'group_researchers') {
                setLoading(true);
                try {
                    const res = await api.get('/researchers');
                    const researchers = res.data;
                    const categories = [...new Set(researchers.map(r => r.category || 'Uncategorized'))];
                    const newNodes = categories.map(cat => ({
                        id: `cat-${cat}`, name: cat, color: '#8b5cf6', type: 'category', raw_category: cat
                    }));
                    const cacheUpdate = {};
                    researchers.forEach(r => {
                        const cat = r.category || 'Uncategorized';
                        if (!cacheUpdate[cat]) cacheUpdate[cat] = [];
                        cacheUpdate[cat].push(r);
                    });
                    setResearcherCache(prev => ({ ...prev, ...cacheUpdate }));
                    addNodesAndLinks(id, newNodes);
                    setInfo("Expanded Researchers. Click a category.");
                } catch (err) {
                    console.error(err);
                    setInfo("Error loading researchers.");
                } finally {
                    setLoading(false);
                }
                return;
            }

            if (type === 'category') {
                const categoryResearchers = researcherCache[customData.raw_category] || [];
                const newNodes = categoryResearchers.map(r => ({
                    id: r._unique_id, name: r.name, subLabel: r.status, color: '#60a5fa', type: 'researcher', data: r
                }));
                addNodesAndLinks(id, newNodes);
                setInfo(`Showing researchers in ${name}.`);
                return;
            }

            if (type === 'researcher') {
                const newNodes = [
                    { id: `p-proj-${id}`, name: 'Publications', color: '#f59e0b', type: 'researcher_projects', parentId: id },
                    { id: `p-collab-${id}`, name: 'Collaborateurs', color: '#ec4899', type: 'researcher_collabs', parentId: id }
                ];
                addNodesAndLinks(id, newNodes);
                setInfo(`Loading data for ${name}...`);
                try {
                    const res = await api.get(`/researcher/${id}`);
                    setResearcherCache(prev => ({ ...prev, [`details-${id}`]: res.data }));
                    setInfo(`Loaded data for ${name}. Click sub-nodes to see details.`);
                } catch (e) {
                    console.error(e);
                    setInfo(`Error loading details for ${name}.`);
                }
                return;
            }

            if (type === 'researcher_projects') {
                const parentId = customData.parentId;
                const details = researcherCache[`details-${parentId}`];
                if (!details || !details.stats) { setInfo("Data missing."); return; }
                const stats = details.stats.hal.found ? details.stats.hal : details.stats.dblp;
                const pubs = stats?.recent_publications || [];
                const newNodes = pubs.slice(0, 5).map((pub, idx) => {
                    let rawTitle = pub.title_s || pub.title || 'Untitled Publication';
                    if (Array.isArray(rawTitle)) rawTitle = rawTitle[0];
                    let authors = pub.authFullName_s || [];
                    if (!Array.isArray(authors)) authors = [authors];
                    return {
                        id: `pub-${parentId}-${idx}`, name: rawTitle, authors, color: '#fcd34d', type: 'item_project'
                    };
                });
                addNodesAndLinks(id, newNodes);
                setInfo(`Showing ${pubs.length} recent publications.`);
                return;
            }

            if (type === 'item_project') {
                const authors = customData.authors || [];
                const newNodes = authors.map((authorName) => ({
                    id: `author-${id}-${authorName.replace(/\s+/g, '_')}`, name: authorName, color: '#f9a8d4', type: 'item_collab', collabName: authorName
                }));
                addNodesAndLinks(id, newNodes);
                setInfo(`Showing ${authors.length} authors.`);
                return;
            }

            if (type === 'researcher_collabs') {
                const parentId = customData.parentId;
                const details = researcherCache[`details-${parentId}`];
                if (!details || !details.stats) { setInfo("Data missing."); return; }
                const stats = details.stats.hal.found ? details.stats.hal : details.stats.dblp;
                const collabs = Object.entries(stats?.top_collaborators || {}).slice(0, 10);
                const newNodes = collabs.map(([collabName]) => ({
                    id: `collab-${parentId}-${collabName.replace(/\s+/g, '_')}`, name: collabName, color: '#f9a8d4', type: 'item_collab', collabName
                }));
                addNodesAndLinks(id, newNodes);
                setInfo("Expanded Collaborators.");
                return;
            }

            if (type === 'item_collab') {
                const collabName = customData.collabName || customData.label;
                setInfo(`Loading data for ${collabName}...`);
                setLoading(true);
                try {
                    const halUrl = `https://api.archives-ouvertes.fr/search/?q=authFullName_t:"${encodeURIComponent(collabName)}"&wt=json&fl=title_s,producedDateY_i,docType_s,keyword_s,authFullName_s,journalTitle_s&rows=50&sort=producedDateY_i%20desc`;
                    const response = await fetch(halUrl);
                    const data = await response.json();
                    const docs = data.response?.docs || [];
                    if (docs.length === 0) {
                        setInfo(`No publications found for ${collabName}.`); setLoading(false); return;
                    }
                    const coAuthors = [];
                    docs.forEach(d => {
                        if (d.authFullName_s) {
                            const authors = Array.isArray(d.authFullName_s) ? d.authFullName_s : [d.authFullName_s];
                            authors.forEach(auth => {
                                if (auth.toLowerCase() !== collabName.toLowerCase()) {
                                    coAuthors.push(auth);
                                }
                            });
                        }
                    });
                    const collabCounts = {};
                    coAuthors.forEach(name => { collabCounts[name] = (collabCounts[name] || 0) + 1; });
                    const topCollaborators = Object.entries(collabCounts).sort((a,b)=>b[1]-a[1]).slice(0,10).reduce((acc, [k,v])=>{acc[k]=v;return acc}, {});

                    setResearcherCache(prev => ({
                        ...prev, [`details-${id}`]: { stats: { hal: { found: true, recent_publications: docs.slice(0,5), top_collaborators: topCollaborators } } }
                    }));

                    const newNodes = [
                        { id: `p-proj-${id}`, name: 'Publications', color: '#f59e0b', type: 'researcher_projects', parentId: id },
                        { id: `p-collab-${id}`, name: 'Collaborateurs', color: '#ec4899', type: 'researcher_collabs', parentId: id }
                    ];
                    addNodesAndLinks(id, newNodes);
                    setInfo(`Loaded ${docs.length} publications for ${collabName}.`);
                } catch (e) {
                    console.error(e);
                    setInfo(`Error loading data for ${collabName}.`);
                } finally {
                    setLoading(false);
                }
                return;
            }

        } catch (e) {
            console.error(e);
        }
    }, [expandedNodes, addNodesAndLinks, removeNodeAndDescendants, researcherCache]);

    return (
        <div className="h-[calc(100vh-100px)] relative overflow-hidden bg-slate-950 mx-4 rounded-3xl shadow-2xl border border-slate-800">
            {/* Info Panel */}
            <div className="absolute top-4 left-4 z-10 p-3 max-w-xs pointer-events-none select-none">
                <p className="text-slate-400 text-xs mb-2">
                    Click to expand, click again to collapse.
                </p>
                <div className="text-xs text-blue-400 font-mono bg-slate-900/80 backdrop-blur-md p-2 rounded-xl border border-slate-800/80 shadow-lg">
                    &gt; {info}
                </div>
            </div>

            {/* Search and Action Bar */}
            <div className="absolute top-4 right-4 z-20 flex flex-col items-end">
                <div className="relative">
                    <div className="flex items-center bg-slate-900/90 backdrop-blur-md border border-slate-700/80 rounded-xl overflow-hidden shadow-2xl transition-all focus-within:border-blue-500/50 focus-within:ring-2 focus-within:ring-blue-500/20">
                        <Search className="w-4 h-4 text-slate-400 ml-3" />
                        <input
                            type="text"
                            placeholder="Rechercher un nœud..."
                            value={searchQuery}
                            onChange={(e) => {
                                setSearchQuery(e.target.value);
                                setShowSearchResults(true);
                            }}
                            onFocus={() => setShowSearchResults(true)}
                            onBlur={() => setTimeout(() => setShowSearchResults(false), 200)}
                            className="bg-transparent text-white text-sm px-3 py-2.5 w-64 outline-none placeholder-slate-500"
                        />
                        {searchQuery && (
                            <button
                                onClick={() => { setSearchQuery(''); setShowSearchResults(false); }}
                                className="text-slate-400 hover:text-white px-3 transition-colors"
                            >
                                ✕
                            </button>
                        )}
                    </div>
                    {showSearchResults && searchResults.length > 0 && (
                        <div className="absolute top-full right-0 mt-2 w-full bg-slate-900/95 backdrop-blur-xl border border-slate-700/80 rounded-xl shadow-2xl max-h-64 overflow-y-auto z-50">
                            {searchResults.map((node) => (
                                <button
                                    key={node.id}
                                    onClick={() => zoomToNode(node)}
                                    className="w-full text-left px-4 py-3 text-sm text-slate-300 hover:bg-slate-800 hover:text-white transition-colors flex items-center gap-3 border-b border-slate-800/50 last:border-b-0"
                                >
                                    <span
                                        className="w-2.5 h-2.5 rounded-full flex-shrink-0 shadow-[0_0_8px_currentColor]"
                                        style={{ backgroundColor: node.data.color, color: node.data.color }}
                                    />
                                    <span className="truncate font-medium">{node.data.label}</span>
                                    <span className="text-xs text-slate-500 ml-auto bg-slate-800 px-2 py-0.5 rounded-md">{node.data.type}</span>
                                </button>
                            ))}
                        </div>
                    )}
                </div>

                <div className="mt-3 flex items-center justify-end gap-4 w-full px-1">
                    <span className="text-xs text-slate-500 font-medium tracking-wide">
                        {nodes.length} NŒUDS
                    </span>
                    <button
                        onClick={exportGraphData}
                        className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium bg-slate-800/80 hover:bg-slate-700 text-slate-300 hover:text-white rounded-lg transition-all border border-slate-700/50 hover:border-slate-500/50 shadow-lg"
                        title="Exporter le graphe en JSON"
                    >
                        <Download className="w-3.5 h-3.5" />
                        Exporter
                    </button>
                </div>
            </div>

            <ReactFlow
                nodes={nodes}
                edges={edges}
                onNodesChange={onNodesChange}
                onEdgesChange={onEdgesChange}
                onNodeClick={handleNodeClick}
                nodeTypes={nodeTypes}
                fitView
                fitViewOptions={{ padding: 0.2 }}
                minZoom={0.1}
                maxZoom={2}
                className="bg-slate-950"
            >
                <Background color="#1e293b" gap={20} size={2} className="opacity-50" />
                <Controls className="!bg-slate-900/80 !border-slate-800/80 !shadow-2xl fill-white hover:!bg-slate-800" />
                <MiniMap 
                    nodeColor={(n) => n.data?.color || '#3b82f6'} 
                    maskColor="rgba(15, 23, 42, 0.8)"
                    className="!bg-slate-900/50 !border-slate-800/80 filter backdrop-blur-md rounded-xl overflow-hidden shadow-2xl" 
                />
            </ReactFlow>

            {loading && (
                <div className="absolute bottom-6 right-6 z-50 bg-slate-900/90 backdrop-blur-md text-white px-5 py-2.5 rounded-full text-sm font-medium border border-blue-500/30 shadow-[0_0_20px_rgba(59,130,246,0.2)] flex items-center gap-3">
                    <div className="w-4 h-4 border-2 border-blue-500 border-t-transparent rounded-full animate-spin"></div>
                    Loading Data...
                </div>
            )}
        </div>
    );
}

export default function NetworkGraph() {
    return (
        <ReactFlowProvider>
            <NetworkGraphInner />
        </ReactFlowProvider>
    );
}
