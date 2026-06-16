import React, { useCallback, useEffect, useMemo, useState } from 'react';
import './Lego.css';

const POSITIONS = '0123456789ABCDEF'.split('');

const SEARCH_TYPES = [
    { value: 'name', label: 'Name' },
    { value: 'part_number', label: 'Part #' },
    { value: 'category', label: 'Category' },
];

function formatPieceCount(count) {
    return count === 1 ? '1 piece' : `${count} pieces`;
}

function normalizeContainerInput(value) {
    const rawValue = String(value || '').trim().toLowerCase();
    const digits = rawValue.replace(/\D/g, '');

    if (digits.length < 3) {
        return '';
    }

    return digits.slice(0, 3);
}

function cleanImageSegment(value) {
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

    const safeCategory = String(category).split('/').map(cleanImageSegment).join('/');
    const safeName = cleanImageSegment(name);
    return `/part_images/${safeCategory}/${safeName}.png`;
}

async function getJson(url) {
    const response = await fetch(url);
    if (!response.ok) {
        throw new Error(response.statusText || 'Request failed');
    }
    return response.json();
}

function normalizeBoxContents(items) {
    const slots = new Map(POSITIONS.map(position => [
        position,
        { position, containerId: '', pieces: [] },
    ]));

    items.forEach(item => {
        const position = String(item.position || '').toUpperCase();
        if (!slots.has(position)) {
            return;
        }

        const slot = slots.get(position);
        if (item.container_id) {
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

    return POSITIONS.map(position => slots.get(position));
}

function ErrorMessage({ message }) {
    if (!message) {
        return null;
    }

    return <div className="lego-alert" role="alert">{message}</div>;
}

function LoadingBlock({ label }) {
    return (
        <div className="loading-block" role="status">
            <span className="loader-dot" />
            <span>{label}</span>
        </div>
    );
}

function EmptyBlock({ title, detail }) {
    return (
        <div className="empty-block">
            <strong>{title}</strong>
            {detail && <span>{detail}</span>}
        </div>
    );
}

function Stat({ label, value }) {
    return (
        <div className="lego-stat">
            <span>{label}</span>
            <strong>{value}</strong>
        </div>
    );
}

function PieceImage({ piece, className = '' }) {
    return (
        <span className={`piece-image-wrap ${className}`}>
            <img
                src={buildImagePath(piece.category, piece.name)}
                alt={piece.name || piece.part_number || 'LEGO piece'}
                loading="lazy"
                onError={(event) => {
                    event.currentTarget.style.display = 'none';
                }}
            />
        </span>
    );
}

function SlotCard({ slot, onOpenSlot }) {
    const hasContainer = Boolean(slot.containerId);
    const previewPieces = slot.pieces.slice(0, 3);
    const extraCount = slot.pieces.length - previewPieces.length;

    return (
        <button
            type="button"
            className={`slot-card ${hasContainer ? 'filled' : 'empty'}`}
            onClick={() => onOpenSlot(slot)}
            disabled={!hasContainer}
        >
            <span className="slot-header">
                <strong>{slot.position}</strong>
                <span>{slot.containerId || 'Empty'}</span>
            </span>

            <span className="slot-meta">
                {hasContainer ? formatPieceCount(slot.pieces.length) : 'No container'}
            </span>

            <span className="slot-preview">
                {previewPieces.length > 0 ? (
                    <>
                        {previewPieces.map((piece, index) => (
                            <PieceImage
                                key={`${slot.position}-${piece.part_number}-${index}`}
                                piece={piece}
                            />
                        ))}
                        {extraCount > 0 && <span className="extra-count">+{extraCount}</span>}
                    </>
                ) : (
                    <span className="quiet-text">
                        {hasContainer ? 'No pieces listed' : 'Open slot'}
                    </span>
                )}
            </span>
        </button>
    );
}

function SlotModal({ slot, onClose, onViewContainer }) {
    useEffect(() => {
        if (!slot) {
            return undefined;
        }

        const handleKeyDown = (event) => {
            if (event.key === 'Escape') {
                onClose();
            }
        };

        window.addEventListener('keydown', handleKeyDown);
        return () => window.removeEventListener('keydown', handleKeyDown);
    }, [slot, onClose]);

    if (!slot) {
        return null;
    }

    return (
        <div className="slot-modal-backdrop" onMouseDown={onClose}>
            <div
                className="slot-modal"
                role="dialog"
                aria-modal="true"
                aria-labelledby="slot-modal-title"
                onMouseDown={(event) => event.stopPropagation()}
            >
                <div className="slot-modal-header">
                    <div>
                        <h3 id="slot-modal-title">{slot.containerId}</h3>
                        <span>Slot {slot.position} - {formatPieceCount(slot.pieces.length)}</span>
                    </div>
                    <button type="button" className="modal-icon-button" onClick={onClose} aria-label="Close">
                        x
                    </button>
                </div>

                {slot.pieces.length > 0 ? (
                    <div className="modal-piece-grid">
                        {slot.pieces.map((piece, index) => (
                            <div className="modal-piece-tile" key={`${piece.part_number}-${index}`}>
                                <PieceImage piece={piece} className="modal-piece-image" />
                                <span>{piece.part_number}</span>
                            </div>
                        ))}
                    </div>
                ) : (
                    <EmptyBlock title="No pieces listed" detail="This container is assigned here, but has no pieces in the box result." />
                )}

                <div className="slot-modal-actions">
                    <button type="button" onClick={onClose}>Close</button>
                    <button type="button" className="primary-action" onClick={() => onViewContainer(slot.containerId)}>
                        View container
                    </button>
                </div>
            </div>
        </div>
    );
}

function BoxesTab({ setActiveTab, setSearchContainerId }) {
    const [boxes, setBoxes] = useState([]);
    const [selectedBox, setSelectedBox] = useState('');
    const [loadedBox, setLoadedBox] = useState('');
    const [boxContents, setBoxContents] = useState([]);
    const [loadingBoxes, setLoadingBoxes] = useState(true);
    const [loadingContents, setLoadingContents] = useState(false);
    const [error, setError] = useState('');
    const [selectedSlot, setSelectedSlot] = useState(null);

    const loadBoxContents = useCallback((boxId) => {
        const nextBox = String(boxId || '').trim();
        if (!nextBox) {
            setError('Select a box first.');
            return;
        }

        setSelectedBox(nextBox);
        setLoadingContents(true);
        setError('');

        getJson(`/lego/api/box/${encodeURIComponent(nextBox)}`)
            .then(data => {
                setBoxContents(Array.isArray(data) ? data : []);
                setLoadedBox(nextBox);
            })
            .catch(() => {
                setBoxContents([]);
                setLoadedBox('');
                setError('Box contents could not be loaded.');
            })
            .finally(() => setLoadingContents(false));
    }, []);

    useEffect(() => {
        let cancelled = false;

        setLoadingBoxes(true);
        getJson('/lego/api/boxes')
            .then(data => {
                if (cancelled) {
                    return;
                }

                const nextBoxes = Array.isArray(data) ? data.map(String) : [];
                setBoxes(nextBoxes);
                setLoadingBoxes(false);

                if (nextBoxes.length > 0) {
                    loadBoxContents(nextBoxes[0]);
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

    const slots = useMemo(() => normalizeBoxContents(boxContents), [boxContents]);
    const selectedIndex = boxes.indexOf(selectedBox);
    const filledSlots = slots.filter(slot => slot.containerId).length;
    const pieceTotal = slots.reduce((total, slot) => total + slot.pieces.length, 0);

    const openSlot = (slot) => {
        if (!slot?.containerId) {
            return;
        }

        setSelectedSlot(slot);
    };

    const viewContainer = (containerId) => {
        setSelectedSlot(null);
        setSearchContainerId(containerId);
        setActiveTab('containers');
    };

    const loadAdjacentBox = (offset) => {
        const nextBox = boxes[selectedIndex + offset];
        if (nextBox) {
            loadBoxContents(nextBox);
        }
    };

    return (
        <section className="lego-section">
            <div className="section-title-row">
                <div>
                    <h2>Boxes</h2>
                    <p>Box {loadedBox || selectedBox || '--'}</p>
                </div>
            </div>

            <div className="toolbar">
                <button
                    type="button"
                    className="square-button"
                    onClick={() => loadAdjacentBox(-1)}
                    disabled={selectedIndex <= 0 || loadingContents}
                    aria-label="Previous box"
                >
                    &lt;
                </button>

                <select
                    value={selectedBox}
                    onChange={(event) => loadBoxContents(event.target.value)}
                    disabled={loadingBoxes}
                    aria-label="Select box"
                >
                    <option value="">Select a box</option>
                    {boxes.map(box => (
                        <option key={box} value={box}>Box {box}</option>
                    ))}
                </select>

                <button
                    type="button"
                    className="square-button"
                    onClick={() => loadAdjacentBox(1)}
                    disabled={selectedIndex === -1 || selectedIndex >= boxes.length - 1 || loadingContents}
                    aria-label="Next box"
                >
                    &gt;
                </button>
            </div>

            <ErrorMessage message={error} />

            {loadingBoxes || loadingContents ? (
                <LoadingBlock label={loadingBoxes ? 'Loading boxes' : 'Loading box'} />
            ) : loadedBox ? (
                <>
                    <div className="stats-row">
                        <Stat label="Filled slots" value={`${filledSlots}/16`} />
                        <Stat label="Pieces" value={pieceTotal} />
                        <Stat label="Empty slots" value={16 - filledSlots} />
                    </div>

                    <div className="slots-grid">
                        {slots.map(slot => (
                            <SlotCard
                                key={slot.position}
                                slot={slot}
                                onOpenSlot={openSlot}
                            />
                        ))}
                    </div>

                    <SlotModal
                        slot={selectedSlot}
                        onClose={() => setSelectedSlot(null)}
                        onViewContainer={viewContainer}
                    />
                </>
            ) : (
                <EmptyBlock title="No box selected" detail="Available boxes will appear when the backend responds." />
            )}
        </section>
    );
}

function PieceRow({ piece }) {
    return (
        <article className="piece-row">
            <PieceImage piece={piece} className="piece-row-image" />
            <div className="piece-row-main">
                <strong>{piece.name || 'Unknown piece'}</strong>
                <span>Part {piece.part_number}</span>
                <span>{piece.category || 'Unknown category'}</span>
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
    const [lastAutoSearch, setLastAutoSearch] = useState('');

    const searchContainer = useCallback((id) => {
        const normalizedId = normalizeContainerInput(id);
        if (!normalizedId) {
            setError('Enter a container ID.');
            return;
        }

        setContainerId(normalizedId);
        setHasSearched(true);
        setLoading(true);
        setContainerDetails(null);
        setError('');

        getJson(`/lego/api/container/${encodeURIComponent(normalizedId)}`)
            .then(data => setContainerDetails(data))
            .catch(() => setError('Container not found.'))
            .finally(() => setLoading(false));
    }, []);

    useEffect(() => {
        const normalizedId = normalizeContainerInput(containerId);

        if (!normalizedId || normalizedId === lastAutoSearch) {
            return;
        }

        const timer = setTimeout(() => {
            setLastAutoSearch(normalizedId);
            setContainerId(normalizedId);
            searchContainer(normalizedId);
        }, 250);

        return () => clearTimeout(timer);
    }, [containerId, lastAutoSearch, searchContainer]);

    useEffect(() => {
        if (initialSearchId) {
            const normalizedId = normalizeContainerInput(initialSearchId);
            setContainerId(normalizedId);
            setLastAutoSearch(normalizedId);
            searchContainer(normalizedId);
        }
    }, [initialSearchId, searchContainer]);

    const pieces = containerDetails?.pieces || [];
    const location = containerDetails?.location?.box
        ? `Box ${containerDetails.location.box}, slot ${String(containerDetails.location.position || '').toUpperCase()}`
        : 'Unassigned';

    return (
        <section className="lego-section">
            <div className="section-title-row">
                <div>
                    <h2>Containers</h2>
                    <p>{containerDetails?.id || 'Type 3 digits to load'}</p>
                </div>
            </div>

            <div className="container-workspace">
                <form
                    className="search-form container-search-form"
                    onSubmit={(event) => {
                        event.preventDefault();
                        searchContainer(containerId);
                    }}
                >
                    <label htmlFor="container-search">Container ID</label>
                    <div className="input-row">
                        <input
                            id="container-search"
                            type="text"
                            placeholder="001"
                            value={containerId}
                            onChange={(event) => {
                                const nextValue = event.target.value;
                                const digitCount = nextValue.replace(/\D/g, '').length;
                                setContainerId(nextValue);
                                setError('');
                                if (digitCount < 3) {
                                    setContainerDetails(null);
                                    setHasSearched(false);
                                    setLastAutoSearch('');
                                }
                            }}
                            autoCapitalize="none"
                            autoComplete="off"
                            inputMode="numeric"
                        />
                        <button type="submit" disabled={loading}>Search</button>
                    </div>
                    <span className="form-hint">
                        Auto-loads after 3 digits.
                    </span>
                </form>

                <div className="container-results">
                    <ErrorMessage message={error} />
                    {loading && <LoadingBlock label="Loading container" />}

                    {!loading && !containerDetails && !hasSearched && (
                        <EmptyBlock title="No container loaded" detail="Type a container number to show its card." />
                    )}

                    {containerDetails && (
                        <article className="container-card">
                            <div className="container-card-header">
                                <div>
                                    <h3>{containerDetails.id}</h3>
                                    <span>{location}</span>
                                </div>
                                <strong>{formatPieceCount(pieces.length)}</strong>
                            </div>

                            {pieces.length > 0 ? (
                                <div className="container-piece-grid">
                                    {pieces.map((piece, index) => (
                                        <PieceRow
                                            key={`${containerDetails.id}-${piece.part_number}-${index}`}
                                            piece={piece}
                                        />
                                    ))}
                                </div>
                            ) : (
                                <EmptyBlock title="Empty container" detail="No pieces are assigned to this container." />
                            )}
                        </article>
                    )}
                </div>
            </div>
        </section>
    );
}

function ResultCard({ piece, onOpenContainer }) {
    const containers = piece.containers || [];

    return (
        <article className="result-card">
            <PieceImage piece={piece} className="result-image" />
            <div className="result-main">
                <h3>{piece.name || 'Unknown piece'}</h3>
                <div className="result-meta">
                    <span>Part {piece.part_number}</span>
                    <span>{piece.category || 'Unknown category'}</span>
                </div>

                <div className="container-chips">
                    {containers.length > 0 ? (
                        containers.map((container, index) => (
                            <button
                                type="button"
                                key={`${piece.part_number}-${container.container_id}-${index}`}
                                onClick={() => onOpenContainer(container.container_id)}
                            >
                                <strong>{container.container_id}</strong>
                                <span>{container.location || 'No location'}</span>
                            </button>
                        ))
                    ) : (
                        <span className="quiet-text">No assigned containers</span>
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

        getJson('/lego/api/categories')
            .then(data => {
                const nextCategories = Array.isArray(data)
                    ? data.filter(Boolean).sort((a, b) => String(a).localeCompare(String(b)))
                    : [];
                setCategories(nextCategories);
            })
            .catch(() => setError('Categories could not be loaded.'));
    }, [searchType, categories.length]);

    const searchPieces = () => {
        const termToSearch = searchType === 'category' ? selectedCategory : searchTerm.trim();
        if (!termToSearch) {
            setError(searchType === 'category' ? 'Select a category.' : 'Enter a search term.');
            return;
        }

        setHasSearched(true);
        setLoading(true);
        setResults([]);
        setError('');

        getJson(`/lego/api/piece/search?type=${searchType}&term=${encodeURIComponent(termToSearch)}`)
            .then(data => setResults(Array.isArray(data) ? data : []))
            .catch(() => setError('Piece search failed.'))
            .finally(() => setLoading(false));
    };

    const openContainer = (containerId) => {
        setSearchContainerId(containerId);
        setActiveTab('containers');
    };

    return (
        <section className="lego-section">
            <div className="section-title-row">
                <div>
                    <h2>Pieces</h2>
                    <p>{hasSearched ? `${results.length} result${results.length === 1 ? '' : 's'}` : 'Catalog search'}</p>
                </div>
            </div>

            <form
                className="search-form"
                onSubmit={(event) => {
                    event.preventDefault();
                    searchPieces();
                }}
            >
                <div className="search-type-tabs" role="tablist" aria-label="Piece search type">
                    {SEARCH_TYPES.map(type => (
                        <button
                            type="button"
                            key={type.value}
                            className={searchType === type.value ? 'active' : ''}
                            onClick={() => {
                                setSearchType(type.value);
                                setError('');
                            }}
                        >
                            {type.label}
                        </button>
                    ))}
                </div>

                <label htmlFor="piece-search-input">
                    {searchType === 'category' ? 'Category' : 'Search'}
                </label>
                <div className="input-row">
                    {searchType === 'category' ? (
                        <select
                            id="piece-search-input"
                            value={selectedCategory}
                            onChange={(event) => setSelectedCategory(event.target.value)}
                        >
                            <option value="">Select a category</option>
                            {categories.map(category => (
                                <option key={category} value={category}>{category}</option>
                            ))}
                        </select>
                    ) : (
                        <input
                            id="piece-search-input"
                            type="search"
                            placeholder={searchType === 'part_number' ? '3001' : 'Brick'}
                            value={searchTerm}
                            onChange={(event) => setSearchTerm(event.target.value)}
                            autoComplete="off"
                        />
                    )}
                    <button type="submit" disabled={loading}>Search</button>
                </div>
            </form>

            <ErrorMessage message={error} />
            {loading && <LoadingBlock label="Searching pieces" />}

            {!loading && !hasSearched && (
                <EmptyBlock title="No search yet" detail="Matching pieces will appear here." />
            )}

            {!loading && hasSearched && results.length === 0 && !error && (
                <EmptyBlock title="No pieces found" detail="Try a broader search term." />
            )}

            {results.length > 0 && (
                <div className="results-grid">
                    {results.map(piece => (
                        <ResultCard
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
        <main className="lego-page">
            <header className="lego-header">
                <div>
                    <span className="app-kicker">LEGO DB</span>
                    <h1>Collection Viewer</h1>
                </div>
            </header>

            <nav className="lego-nav" aria-label="LEGO sections">
                {tabs.map(tab => (
                    <button
                        type="button"
                        key={tab.id}
                        className={activeTab === tab.id ? 'active' : ''}
                        onClick={() => setActiveTab(tab.id)}
                    >
                        {tab.label}
                    </button>
                ))}
            </nav>

            {renderTabContent()}
        </main>
    );
}

export default Lego;
