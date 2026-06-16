import React, { useCallback, useEffect, useMemo, useState } from 'react';
import './Lego.css';

const POSITIONS = '0123456789ABCDEF'.split('');

const SEARCH_MODES = [
    { id: 'name', label: 'Name' },
    { id: 'part_number', label: 'Part #' },
    { id: 'category', label: 'Category' },
];

function fetchJson(url) {
    return fetch(url).then(async response => {
        if (!response.ok) {
            let message = 'Request failed';
            try {
                const body = await response.json();
                message = body.error || message;
            } catch {
                message = response.statusText || message;
            }
            throw new Error(message);
        }
        return response.json();
    });
}

function sanitizeImageSegment(value) {
    return String(value || '')
        .trim()
        .replace(/\u00c2\u00b0/g, 'deg')
        .replace(/\u00b0/g, 'deg')
        .replace(/\u00e2\u0085\u0093/g, '1_3')
        .replace(/\u00e2\u0085\u0094/g, '2_3')
        .replace(/\u2153/g, '1_3')
        .replace(/\u2154/g, '2_3')
        .replace(/[\\:*?"<>|]/g, '')
        .replace(/\s+/g, '_');
}

function buildImagePath(category, name) {
    if (!category || !name) {
        return '/part_images/placeholder.png';
    }

    const safeCategory = String(category)
        .split('/')
        .map(sanitizeImageSegment)
        .join('/');
    const safeName = sanitizeImageSegment(name);

    return `/part_images/${safeCategory}/${safeName}.png`;
}

function hideBrokenImage(event) {
    event.currentTarget.style.display = 'none';
}

function ErrorMessage({ message }) {
    if (!message) {
        return null;
    }

    return (
        <div className="lego-alert" role="alert">
            {message}
        </div>
    );
}

function LoadingState({ label = 'Loading' }) {
    return (
        <div className="lego-loading" role="status" aria-live="polite">
            <span className="lego-spinner" />
            <span>{label}</span>
        </div>
    );
}

function EmptyState({ title, detail }) {
    return (
        <div className="lego-empty">
            <strong>{title}</strong>
            {detail && <span>{detail}</span>}
        </div>
    );
}

function StatTile({ label, value }) {
    return (
        <div className="stat-tile">
            <span>{label}</span>
            <strong>{value}</strong>
        </div>
    );
}

function normalizeBoxContents(contents) {
    const byPosition = new Map();

    contents.forEach(item => {
        const position = String(item.position || '').toUpperCase();
        if (!position) {
            return;
        }

        if (!byPosition.has(position)) {
            byPosition.set(position, {
                position,
                containerId: item.container_id || '',
                pieces: [],
            });
        }

        const slot = byPosition.get(position);
        if (!slot.containerId && item.container_id) {
            slot.containerId = item.container_id;
        }

        if (item.part_number) {
            slot.pieces.push({
                part_number: item.part_number,
                name: item.name,
                category: item.category,
            });
        }
    });

    return POSITIONS.map(position => (
        byPosition.get(position) || { position, containerId: '', pieces: [] }
    ));
}

function PieceImage({ piece, className = '' }) {
    return (
        <span className={`piece-image-frame ${className}`}>
            <img
                src={buildImagePath(piece.category, piece.name)}
                alt={piece.name || piece.part_number || 'LEGO piece'}
                loading="lazy"
                onError={hideBrokenImage}
            />
        </span>
    );
}

function PositionCard({ slot, onOpenContainer }) {
    const hasContainer = Boolean(slot.containerId);
    const previewPieces = slot.pieces.slice(0, 4);
    const remainingPieces = Math.max(0, slot.pieces.length - previewPieces.length);
    const status = hasContainer
        ? `${slot.pieces.length} ${slot.pieces.length === 1 ? 'piece' : 'pieces'}`
        : 'Empty';

    const content = (
        <>
            <div className="position-card-top">
                <span className="position-id">Slot {slot.position}</span>
                <span className={`slot-status ${hasContainer ? 'is-filled' : 'is-empty'}`}>
                    {status}
                </span>
            </div>
            <div className="container-code">
                {hasContainer ? slot.containerId : 'No container'}
            </div>
            <div className="piece-preview-strip" aria-hidden={!previewPieces.length}>
                {previewPieces.length > 0 ? (
                    <>
                        {previewPieces.map(piece => (
                            <PieceImage
                                key={`${slot.position}-${piece.part_number}-${piece.name}`}
                                piece={piece}
                            />
                        ))}
                        {remainingPieces > 0 && (
                            <span className="more-pieces">+{remainingPieces}</span>
                        )}
                    </>
                ) : (
                    <span className="preview-placeholder">
                        {hasContainer ? 'Container is empty' : 'Open slot'}
                    </span>
                )}
            </div>
        </>
    );

    if (!hasContainer) {
        return (
            <div className="position-card is-empty-card">
                {content}
            </div>
        );
    }

    return (
        <button
            type="button"
            className="position-card"
            onClick={() => onOpenContainer(slot.containerId)}
        >
            {content}
        </button>
    );
}

function BoxesTab({ setActiveTab, setSearchContainerId }) {
    const [boxes, setBoxes] = useState([]);
    const [selectedBox, setSelectedBox] = useState('');
    const [boxContents, setBoxContents] = useState([]);
    const [loadingBoxes, setLoadingBoxes] = useState(true);
    const [loadingContents, setLoadingContents] = useState(false);
    const [error, setError] = useState('');

    const loadBoxContents = useCallback((boxId) => {
        const nextBox = String(boxId || '').trim();
        if (!nextBox) {
            setError('Choose a box first.');
            return;
        }

        setSelectedBox(nextBox);
        setLoadingContents(true);
        setError('');

        fetchJson(`/lego/api/box/${encodeURIComponent(nextBox)}`)
            .then(data => setBoxContents(Array.isArray(data) ? data : []))
            .catch(() => {
                setBoxContents([]);
                setError('Box contents could not be loaded.');
            })
            .finally(() => setLoadingContents(false));
    }, []);

    useEffect(() => {
        let cancelled = false;

        fetchJson('/lego/api/boxes')
            .then(data => {
                if (cancelled) {
                    return;
                }

                const normalizedBoxes = Array.isArray(data) ? data.map(String) : [];
                setBoxes(normalizedBoxes);
                setLoadingBoxes(false);

                if (normalizedBoxes.length > 0) {
                    loadBoxContents(normalizedBoxes[0]);
                }
            })
            .catch(() => {
                if (!cancelled) {
                    setBoxes([]);
                    setLoadingBoxes(false);
                    setError('Boxes could not be loaded.');
                }
            });

        return () => {
            cancelled = true;
        };
    }, [loadBoxContents]);

    const positions = useMemo(() => normalizeBoxContents(boxContents), [boxContents]);
    const selectedIndex = boxes.indexOf(selectedBox);
    const occupiedSlots = positions.filter(slot => slot.containerId).length;
    const indexedPieces = positions.reduce((total, slot) => total + slot.pieces.length, 0);

    const openContainer = (containerId) => {
        setSearchContainerId(containerId);
        setActiveTab('containers');
    };

    const goToOffset = (offset) => {
        if (selectedIndex < 0) {
            return;
        }

        const nextBox = boxes[selectedIndex + offset];
        if (nextBox) {
            loadBoxContents(nextBox);
        }
    };

    return (
        <section className="tab-panel" aria-labelledby="boxes-heading">
            <div className="section-heading">
                <div>
                    <p className="eyebrow">Inventory map</p>
                    <h2 id="boxes-heading">Boxes</h2>
                </div>
                {selectedBox && <span className="selected-badge">Box {selectedBox}</span>}
            </div>

            <div className="lego-panel">
                <div className="selector-row">
                    <button
                        type="button"
                        className="icon-button"
                        aria-label="Previous box"
                        onClick={() => goToOffset(-1)}
                        disabled={selectedIndex <= 0 || loadingContents}
                    >
                        &lt;
                    </button>

                    <label className="sr-only" htmlFor="box-selector">Box</label>
                    <select
                        id="box-selector"
                        value={selectedBox}
                        onChange={(event) => loadBoxContents(event.target.value)}
                        disabled={loadingBoxes}
                    >
                        <option value="">Select a box</option>
                        {boxes.map(box => (
                            <option key={box} value={box}>Box {box}</option>
                        ))}
                    </select>

                    <button
                        type="button"
                        className="icon-button"
                        aria-label="Next box"
                        onClick={() => goToOffset(1)}
                        disabled={selectedIndex === -1 || selectedIndex >= boxes.length - 1 || loadingContents}
                    >
                        &gt;
                    </button>
                </div>
            </div>

            <ErrorMessage message={error} />

            {loadingBoxes || loadingContents ? (
                <LoadingState label={loadingBoxes ? 'Loading boxes' : 'Loading box'} />
            ) : (
                <>
                    <div className="stat-grid">
                        <StatTile label="Box" value={selectedBox || '--'} />
                        <StatTile label="Slots" value={`${occupiedSlots}/16`} />
                        <StatTile label="Pieces" value={indexedPieces} />
                    </div>

                    {selectedBox ? (
                        <div className="position-grid">
                            {positions.map(slot => (
                                <PositionCard
                                    key={slot.position}
                                    slot={slot}
                                    onOpenContainer={openContainer}
                                />
                            ))}
                        </div>
                    ) : (
                        <EmptyState title="No box selected" detail="Available boxes will appear here." />
                    )}
                </>
            )}
        </section>
    );
}

function PieceRow({ piece }) {
    return (
        <article className="piece-row">
            <PieceImage piece={piece} className="piece-row-image" />
            <div>
                <h4>{piece.name || 'Unknown piece'}</h4>
                <dl className="compact-meta">
                    <div>
                        <dt>Part</dt>
                        <dd>{piece.part_number}</dd>
                    </div>
                    <div>
                        <dt>Category</dt>
                        <dd>{piece.category || 'Unknown'}</dd>
                    </div>
                </dl>
            </div>
        </article>
    );
}

function ContainersTab({ initialSearchId = '' }) {
    const [containerId, setContainerId] = useState(initialSearchId);
    const [containerDetails, setContainerDetails] = useState(null);
    const [error, setError] = useState('');
    const [loading, setLoading] = useState(false);
    const [hasSearched, setHasSearched] = useState(Boolean(initialSearchId));

    const searchContainer = useCallback((id) => {
        const term = String(id || '').trim();
        if (!term) {
            setError('Enter a container ID.');
            return;
        }

        setHasSearched(true);
        setLoading(true);
        setContainerDetails(null);
        setError('');

        fetchJson(`/lego/api/container/${encodeURIComponent(term)}`)
            .then(data => setContainerDetails(data))
            .catch(() => setError('Container not found. Check the ID and try again.'))
            .finally(() => setLoading(false));
    }, []);

    useEffect(() => {
        const term = String(initialSearchId || '').trim();
        if (term) {
            setContainerId(term);
            searchContainer(term);
        }
    }, [initialSearchId, searchContainer]);

    const pieces = containerDetails?.pieces || [];
    const location = containerDetails?.location?.box
        ? `Box ${containerDetails.location.box}, slot ${String(containerDetails.location.position || '').toUpperCase()}`
        : 'Unassigned';

    return (
        <section className="tab-panel" aria-labelledby="containers-heading">
            <div className="section-heading">
                <div>
                    <p className="eyebrow">Find a bin</p>
                    <h2 id="containers-heading">Containers</h2>
                </div>
            </div>

            <form
                className="lego-panel search-panel"
                onSubmit={(event) => {
                    event.preventDefault();
                    searchContainer(containerId);
                }}
            >
                <label className="field-label" htmlFor="container-search">Container ID</label>
                <div className="search-controls">
                    <input
                        type="text"
                        id="container-search"
                        placeholder="c001"
                        value={containerId}
                        onChange={(event) => setContainerId(event.target.value)}
                        autoCapitalize="none"
                        autoComplete="off"
                    />
                    <button type="submit" disabled={loading}>
                        Search
                    </button>
                </div>
            </form>

            <ErrorMessage message={error} />
            {loading && <LoadingState label="Loading container" />}

            {!loading && !containerDetails && !hasSearched && (
                <EmptyState title="Ready to search" detail="Container details will appear here." />
            )}

            {containerDetails && (
                <>
                    <div className="stat-grid">
                        <StatTile label="Container" value={containerDetails.id} />
                        <StatTile label="Location" value={location} />
                        <StatTile label="Pieces" value={pieces.length} />
                    </div>

                    {pieces.length > 0 ? (
                        <div className="piece-list-grid">
                            {pieces.map(piece => (
                                <PieceRow
                                    key={`${containerDetails.id}-${piece.part_number}-${piece.name}`}
                                    piece={piece}
                                />
                            ))}
                        </div>
                    ) : (
                        <EmptyState title="Empty container" detail="No pieces are assigned to this container." />
                    )}
                </>
            )}
        </section>
    );
}

function PieceResultCard({ piece, onOpenContainer }) {
    const containers = piece.containers || [];

    return (
        <article className="result-card">
            <PieceImage piece={piece} className="result-image" />
            <div className="result-body">
                <h3>{piece.name || 'Unknown piece'}</h3>
                <dl className="compact-meta">
                    <div>
                        <dt>Part</dt>
                        <dd>{piece.part_number}</dd>
                    </div>
                    <div>
                        <dt>Category</dt>
                        <dd>{piece.category || 'Unknown'}</dd>
                    </div>
                </dl>

                <div className="container-links" aria-label="Containers with this piece">
                    {containers.length > 0 ? (
                        containers.map(container => (
                            <button
                                type="button"
                                key={`${piece.part_number}-${container.container_id}`}
                                onClick={() => onOpenContainer(container.container_id)}
                            >
                                <span>{container.container_id}</span>
                                <small>{container.location || 'No location'}</small>
                            </button>
                        ))
                    ) : (
                        <span className="muted-text">No assigned containers</span>
                    )}
                </div>
            </div>
        </article>
    );
}

function PiecesTab({ setActiveTab, setSearchContainerId }) {
    const [searchType, setSearchType] = useState('name');
    const [searchTerm, setSearchTerm] = useState('');
    const [categories, setCategories] = useState([]);
    const [selectedCategory, setSelectedCategory] = useState('');
    const [results, setResults] = useState([]);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');
    const [hasSearched, setHasSearched] = useState(false);

    useEffect(() => {
        if (searchType !== 'category' || categories.length > 0) {
            return;
        }

        fetchJson('/lego/api/categories')
            .then(data => {
                const nextCategories = Array.isArray(data)
                    ? data.filter(Boolean).sort((a, b) => String(a).localeCompare(String(b)))
                    : [];
                setCategories(nextCategories);
            })
            .catch(() => setError('Categories could not be loaded.'));
    }, [categories.length, searchType]);

    const searchPieces = () => {
        const termToSearch = searchType === 'category'
            ? selectedCategory
            : searchTerm.trim();

        if (!termToSearch) {
            setError(searchType === 'category' ? 'Choose a category.' : 'Enter a search term.');
            return;
        }

        setHasSearched(true);
        setLoading(true);
        setResults([]);
        setError('');

        fetchJson(`/lego/api/piece/search?type=${searchType}&term=${encodeURIComponent(termToSearch)}`)
            .then(data => setResults(Array.isArray(data) ? data : []))
            .catch(() => setError('Piece search failed. Try again.'))
            .finally(() => setLoading(false));
    };

    const openContainer = (containerId) => {
        setSearchContainerId(containerId);
        setActiveTab('containers');
    };

    return (
        <section className="tab-panel" aria-labelledby="pieces-heading">
            <div className="section-heading">
                <div>
                    <p className="eyebrow">Catalog lookup</p>
                    <h2 id="pieces-heading">Pieces</h2>
                </div>
                {hasSearched && <span className="selected-badge">{results.length} found</span>}
            </div>

            <form
                className="lego-panel search-panel"
                onSubmit={(event) => {
                    event.preventDefault();
                    searchPieces();
                }}
            >
                <div className="segmented-control" role="tablist" aria-label="Piece search type">
                    {SEARCH_MODES.map(mode => (
                        <button
                            type="button"
                            role="tab"
                            key={mode.id}
                            aria-selected={searchType === mode.id}
                            className={searchType === mode.id ? 'is-active' : ''}
                            onClick={() => {
                                setSearchType(mode.id);
                                setError('');
                            }}
                        >
                            {mode.label}
                        </button>
                    ))}
                </div>

                {searchType === 'category' ? (
                    <>
                        <label className="field-label" htmlFor="category-select">Category</label>
                        <div className="search-controls">
                            <select
                                id="category-select"
                                value={selectedCategory}
                                onChange={(event) => setSelectedCategory(event.target.value)}
                            >
                                <option value="">Select a category</option>
                                {categories.map(category => (
                                    <option key={category} value={category}>{category}</option>
                                ))}
                            </select>
                            <button type="submit" disabled={loading}>
                                Search
                            </button>
                        </div>
                    </>
                ) : (
                    <>
                        <label className="field-label" htmlFor="piece-search">
                            {searchType === 'part_number' ? 'Part number' : 'Piece name'}
                        </label>
                        <div className="search-controls">
                            <input
                                type="search"
                                id="piece-search"
                                placeholder={searchType === 'part_number' ? '3001' : 'Brick'}
                                value={searchTerm}
                                onChange={(event) => setSearchTerm(event.target.value)}
                                autoComplete="off"
                            />
                            <button type="submit" disabled={loading}>
                                Search
                            </button>
                        </div>
                    </>
                )}
            </form>

            <ErrorMessage message={error} />
            {loading && <LoadingState label="Searching pieces" />}

            {!loading && !hasSearched && (
                <EmptyState title="No search yet" detail="Matching pieces will appear here." />
            )}

            {!loading && hasSearched && results.length === 0 && !error && (
                <EmptyState title="No pieces found" detail="Try a broader name or category." />
            )}

            {results.length > 0 && (
                <div className="results-grid">
                    {results.map(piece => (
                        <PieceResultCard
                            key={piece.part_number}
                            piece={piece}
                            onOpenContainer={openContainer}
                        />
                    ))}
                </div>
            )}
        </section>
    );
}

function Lego() {
    const [activeTab, setActiveTab] = useState('boxes');
    const [searchContainerId, setSearchContainerId] = useState('');

    const tabs = [
        { id: 'boxes', label: 'Boxes' },
        { id: 'containers', label: 'Containers' },
        { id: 'pieces', label: 'Pieces' },
    ];

    const renderTabContent = () => {
        switch (activeTab) {
            case 'boxes':
                return (
                    <BoxesTab
                        setActiveTab={setActiveTab}
                        setSearchContainerId={setSearchContainerId}
                    />
                );
            case 'containers':
                return <ContainersTab initialSearchId={searchContainerId} />;
            case 'pieces':
                return (
                    <PiecesTab
                        setActiveTab={setActiveTab}
                        setSearchContainerId={setSearchContainerId}
                    />
                );
            default:
                return null;
        }
    };

    return (
        <main className="lego-app">
            <div className="lego-shell">
                <header className="lego-hero">
                    <div>
                        <p className="eyebrow">LEGO DB</p>
                        <h1>Collection Console</h1>
                    </div>
                    <div className="hero-mark" aria-hidden="true">
                        <span />
                        <span />
                        <span />
                    </div>
                </header>

                <nav className="lego-tabs" role="tablist" aria-label="LEGO views">
                    {tabs.map(tab => (
                        <button
                            type="button"
                            role="tab"
                            key={tab.id}
                            aria-selected={activeTab === tab.id}
                            className={activeTab === tab.id ? 'is-active' : ''}
                            onClick={() => setActiveTab(tab.id)}
                        >
                            {tab.label}
                        </button>
                    ))}
                </nav>

                {renderTabContent()}
            </div>
        </main>
    );
}

export default Lego;
