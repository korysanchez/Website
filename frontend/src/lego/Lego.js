import React, { useCallback, useEffect, useMemo, useState } from 'react';
import './Lego.css';

const POSITIONS = '0123456789ABCDEF'.split('');
const BOX_DISPLAY_POSITIONS = ['0', '8', '1', '9', '2', 'A', '3', 'B', '4', 'C', '5', 'D', '6', 'E', '7', 'F'];

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
    const previewPieces = slot.pieces.slice(0, 2);
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
                        {hasContainer ? 'Empty' : 'Open'}
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
                                <span title={piece.name || piece.part_number || 'Unknown piece'}>
                                    {piece.name || piece.part_number || 'Unknown piece'}
                                </span>
                            </div>
                        ))}
                    </div>
                ) : (
                    <p className="quiet-text">No pieces listed.</p>
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

function BoxesTab({ setActiveTab, setSearchContainerId, initialBox = '' }) {
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

                const targetBox = String(initialBox || '').trim();
                if (targetBox && nextBoxes.includes(targetBox)) {
                    loadBoxContents(targetBox);
                } else if (nextBoxes.length > 0) {
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
    }, [initialBox, loadBoxContents]);

    const slots = useMemo(() => normalizeBoxContents(boxContents), [boxContents]);
    const displayedSlots = useMemo(() => {
        const slotMap = new Map(slots.map(slot => [slot.position, slot]));
        return BOX_DISPLAY_POSITIONS.map(position => slotMap.get(position));
    }, [slots]);
    const selectedIndex = boxes.indexOf(selectedBox);

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
                    <div className="slots-grid">
                        {displayedSlots.map(slot => (
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

function ContainerPieceTile({ piece, onOpen }) {
    const pieceName = piece.name || piece.part_number || 'Unknown piece';

    return (
        <button
            type="button"
            className="container-piece-tile"
            onClick={() => onOpen(piece)}
        >
            <PieceImage piece={piece} className="container-piece-image" />
            <span title={pieceName}>{pieceName}</span>
        </button>
    );
}

function PieceDetailModal({ piece, containerId, location, onClose, onOpenPiece }) {
    useEffect(() => {
        if (!piece) {
            return undefined;
        }

        const handleKeyDown = (event) => {
            if (event.key === 'Escape') {
                onClose();
            }
        };

        window.addEventListener('keydown', handleKeyDown);
        return () => window.removeEventListener('keydown', handleKeyDown);
    }, [piece, onClose]);

    if (!piece) {
        return null;
    }

    const pieceName = piece.name || piece.part_number || 'Unknown piece';

    return (
        <div className="slot-modal-backdrop" onMouseDown={onClose}>
            <div
                className="slot-modal piece-detail-modal"
                role="dialog"
                aria-modal="true"
                aria-labelledby="piece-detail-title"
                onMouseDown={(event) => event.stopPropagation()}
            >
                <div className="slot-modal-header">
                    <div>
                        <h3 id="piece-detail-title">{pieceName}</h3>
                        <span>Part {piece.part_number || 'Unknown'}</span>
                    </div>
                    <button type="button" className="modal-icon-button" onClick={onClose} aria-label="Close">
                        x
                    </button>
                </div>

                <div className="piece-detail-body">
                    <PieceImage piece={piece} className="piece-detail-image" />
                    <div className="piece-detail-meta">
                        <span>
                            <strong>Part</strong>
                            {piece.part_number || 'Unknown'}
                        </span>
                        <span>
                            <strong>Category</strong>
                            {piece.category || 'Unknown category'}
                        </span>
                        <span>
                            <strong>Container</strong>
                            {containerId || 'Unknown'}
                        </span>
                        <span>
                            <strong>Location</strong>
                            {location || 'Unassigned'}
                        </span>
                    </div>
                </div>

                <div className="slot-modal-actions">
                    <button type="button" onClick={onClose}>Close</button>
                    <button type="button" className="primary-action" onClick={() => onOpenPiece(piece)}>
                        Open in Pieces
                    </button>
                </div>
            </div>
        </div>
    );
}

function buildBoxContainerMap(items) {
    const slotMap = new Map();

    items.forEach(item => {
        const position = String(item.position || '').toUpperCase();
        if (position && item.container_id && !slotMap.has(position)) {
            slotMap.set(position, item.container_id);
        }
    });

    return slotMap;
}

function BoxPositionMap({ activePosition, boxContents, onSelectContainer }) {
    const normalizedActivePosition = String(activePosition || '').toUpperCase();
    const containerMap = useMemo(() => buildBoxContainerMap(boxContents), [boxContents]);

    return (
        <div className="box-position-map" aria-label={`Container position ${normalizedActivePosition || 'unassigned'}`}>
            {BOX_DISPLAY_POSITIONS.map(position => {
                const containerId = containerMap.get(position);
                const isActive = position === normalizedActivePosition;
                const content = (
                    <>
                        <strong>{position}</strong>
                        {containerId && <small>{containerId}</small>}
                    </>
                );

                return containerId ? (
                    <button
                        type="button"
                        key={position}
                        className={isActive ? 'active' : ''}
                        onClick={() => onSelectContainer(containerId)}
                    >
                        {content}
                    </button>
                ) : (
                    <span key={position} className={isActive ? 'active' : ''}>
                        {content}
                    </span>
                );
            })}
        </div>
    );
}

function ContainersTab({ initialSearchId = '', onOpenBox = () => {}, onOpenPiece = () => {} }) {
    const [containerId, setContainerId] = useState(initialSearchId);
    const [containerDetails, setContainerDetails] = useState(null);
    const [error, setError] = useState('');
    const [loading, setLoading] = useState(false);
    const [lastAutoSearch, setLastAutoSearch] = useState('');
    const [boxContents, setBoxContents] = useState([]);
    const [selectedPiece, setSelectedPiece] = useState(null);

    const searchContainer = useCallback((id) => {
        const normalizedId = normalizeContainerInput(id);
        if (!normalizedId) {
            setError('Enter a container ID.');
            return;
        }

        setContainerId(normalizedId);
        setLastAutoSearch(normalizedId);
        setLoading(true);
        setContainerDetails(null);
        setSelectedPiece(null);
        setError('');

        getJson(`/lego/api/container/${encodeURIComponent(normalizedId)}`)
            .then(data => setContainerDetails(data))
            .catch(() => setError('Container not found.'))
            .finally(() => setLoading(false));
    }, []);

    useEffect(() => {
        const boxId = containerDetails?.location?.box;

        if (!boxId) {
            setBoxContents([]);
            return;
        }

        getJson(`/lego/api/box/${encodeURIComponent(boxId)}`)
            .then(data => setBoxContents(Array.isArray(data) ? data : []))
            .catch(() => setBoxContents([]));
    }, [containerDetails]);

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
    const boxId = containerDetails?.location?.box;
    const positionId = String(containerDetails?.location?.position || '').toUpperCase();
    const location = containerDetails?.location?.box
        ? `Slot ${positionId}`
        : 'Unassigned';

    return (
        <section className="lego-section">

            <div className="container-workspace">
                <form
                    className="search-form container-search-form"
                    onSubmit={(event) => {
                        event.preventDefault();
                        searchContainer(containerId);
                    }}
                >
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
                                    setSelectedPiece(null);
                                    setLastAutoSearch('');
                                }
                            }}
                            autoCapitalize="none"
                            autoComplete="off"
                            inputMode="numeric"
                        />
                        <button type="submit" disabled={loading}>Search</button>
                    </div>
                </form>

                <div className="container-results">
                    <ErrorMessage message={error} />
                    {loading && <LoadingBlock label="Loading container" />}

                    {containerDetails && (
                        <article className="container-card">
                            <div className="container-overview">
                                <div className="container-card-header">
                                    <h3>{containerDetails.id}</h3>
                                    <span>{location}</span>
                                    {boxId && (
                                        <button
                                            type="button"
                                            className="box-chip"
                                            onClick={() => onOpenBox(boxId)}
                                        >
                                            Box {boxId}
                                        </button>
                                    )}
                                    <strong>{formatPieceCount(pieces.length)}</strong>
                                </div>

                                <BoxPositionMap
                                    activePosition={containerDetails.location?.position}
                                    boxContents={boxContents}
                                    onSelectContainer={searchContainer}
                                />
                            </div>

                            {pieces.length > 0 ? (
                                <div className="container-piece-grid">
                                    {pieces.map((piece, index) => (
                                        <ContainerPieceTile
                                            key={`${containerDetails.id}-${piece.part_number}-${index}`}
                                            piece={piece}
                                            onOpen={setSelectedPiece}
                                        />
                                    ))}
                                </div>
                            ) : (
                                <p className="quiet-text">No pieces assigned.</p>
                            )}

                            <PieceDetailModal
                                piece={selectedPiece}
                                containerId={containerDetails.id}
                                location={location}
                                onClose={() => setSelectedPiece(null)}
                                onOpenPiece={onOpenPiece}
                            />
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

function PiecesTab({ setActiveTab, setSearchContainerId, initialSearch }) {
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

    const performPieceSearch = useCallback((type, term) => {
        const nextType = type || 'name';
        const termToSearch = String(term || '').trim();

        if (!termToSearch) {
            setError(nextType === 'category' ? 'Select a category.' : 'Enter a search term.');
            return;
        }

        setHasSearched(true);
        setLoading(true);
        setResults([]);
        setError('');

        getJson(`/lego/api/piece/search?type=${encodeURIComponent(nextType)}&term=${encodeURIComponent(termToSearch)}`)
            .then(data => setResults(Array.isArray(data) ? data : []))
            .catch(() => setError('Piece search failed.'))
            .finally(() => setLoading(false));
    }, []);

    const searchPieces = () => {
        const termToSearch = searchType === 'category' ? selectedCategory : searchTerm.trim();
        performPieceSearch(searchType, termToSearch);
    };

    useEffect(() => {
        const nextType = initialSearch?.type;
        const nextTerm = String(initialSearch?.term || '').trim();

        if (!nextType || !nextTerm) {
            return;
        }

        setSearchType(nextType);
        if (nextType === 'category') {
            setSelectedCategory(nextTerm);
        } else {
            setSearchTerm(nextTerm);
            setSelectedCategory('');
        }
        setError('');
        performPieceSearch(nextType, nextTerm);
    }, [initialSearch, performPieceSearch]);

    const openContainer = (containerId) => {
        setSearchContainerId(containerId);
        setActiveTab('containers');
    };

    return (
        <section className="lego-section">

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
    const [boxToOpen, setBoxToOpen] = useState('');
    const [pieceSearch, setPieceSearch] = useState(null);

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
                        initialBox={boxToOpen}
                    />
                );
            case 'containers':
                return (
                    <ContainersTab
                        initialSearchId={searchContainerId}
                        onOpenBox={(boxId) => {
                            setBoxToOpen(String(boxId || ''));
                            setActiveTab('boxes');
                        }}
                        onOpenPiece={(piece) => {
                            const partNumber = String(piece?.part_number || '').trim();
                            if (!partNumber) {
                                return;
                            }

                            setPieceSearch({ type: 'part_number', term: partNumber });
                            setActiveTab('pieces');
                        }}
                    />
                );
            case 'pieces':
                return (
                    <PiecesTab
                        setActiveTab={setActiveTab}
                        setSearchContainerId={setSearchContainerId}
                        initialSearch={pieceSearch}
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
                    <span>Collection Viewer</span>
                </div>
                <select
                    className="mobile-section-select"
                    value={activeTab}
                    onChange={(event) => setActiveTab(event.target.value)}
                    aria-label="Select LEGO section"
                >
                    {tabs.map(tab => (
                        <option key={tab.id} value={tab.id}>{tab.label}</option>
                    ))}
                </select>
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
