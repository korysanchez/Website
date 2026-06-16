import React, { useCallback, useEffect, useState } from 'react';
import './Lego.css';

function buildImagePath(category, name) {
    if (!category || !name) {
        return '/part_images/placeholder.png';
    }

    const cleanSegment = (value) => String(value)
        .replace(/\u00c2\u00b0/g, 'deg')
        .replace(/\u00b0/g, 'deg')
        .replace(/\u00e2\u0085\u0093/g, '1_3')
        .replace(/\u00e2\u0085\u0094/g, '2_3')
        .replace(/\u2153/g, '1_3')
        .replace(/\u2154/g, '2_3')
        .replace(/\s+/g, '_');

    const safeCategory = String(category).split('/').map(cleanSegment).join('/');
    const safeName = cleanSegment(name);

    return `/part_images/${safeCategory}/${safeName}.png`;
}

const ErrorMessage = ({ message }) => {
    if (!message) {
        return null;
    }

    return <div className="lego-error">{message}</div>;
};

const PieceImage = ({ piece, className = '' }) => (
    <img
        className={`piece-image ${className}`}
        src={buildImagePath(piece.category, piece.name)}
        alt={piece.name || piece.part_number || 'Unknown piece'}
        loading="lazy"
        onError={(event) => {
            event.currentTarget.style.visibility = 'hidden';
        }}
    />
);

const BoxesTab = ({ setActiveTab, setSearchContainerId }) => {
    const [boxes, setBoxes] = useState([]);
    const [selectedBox, setSelectedBox] = useState('');
    const [boxContents, setBoxContents] = useState([]);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');

    useEffect(() => {
        fetch('/lego/api/boxes')
            .then(response => response.json())
            .then(data => setBoxes(Array.isArray(data) ? data.map(String) : []))
            .catch(() => setError('Failed to load boxes. Please try again.'));
    }, []);

    const loadBoxContents = (boxId) => {
        if (!boxId) {
            setError('Please select a box.');
            return;
        }

        setSelectedBox(boxId);
        setLoading(true);
        setError('');

        fetch(`/lego/api/box/${encodeURIComponent(boxId)}`)
            .then(response => response.json())
            .then(data => {
                setBoxContents(Array.isArray(data) ? data : []);
                setLoading(false);
            })
            .catch(() => {
                setError('Failed to load box contents. Please try again.');
                setLoading(false);
            });
    };

    const handleNextBox = () => {
        const currentIndex = boxes.indexOf(selectedBox);
        if (currentIndex < boxes.length - 1) {
            loadBoxContents(boxes[currentIndex + 1]);
        }
    };

    const handlePrevBox = () => {
        const currentIndex = boxes.indexOf(selectedBox);
        if (currentIndex > 0) {
            loadBoxContents(boxes[currentIndex - 1]);
        }
    };

    const openContainer = (containerId) => {
        if (!containerId) {
            return;
        }

        setSearchContainerId(containerId);
        setActiveTab('containers');
    };

    const renderPosition = (position) => {
        const pieces = boxContents.filter(item => String(item.position || '').toUpperCase() === position);
        const containerId = pieces[0]?.container_id || '';
        const realPieces = pieces.filter(piece => piece.part_number);
        const previewPieces = realPieces.slice(0, 4);

        return (
            <button
                type="button"
                key={position}
                className={`position-card ${containerId ? '' : 'empty'}`}
                onClick={() => openContainer(containerId)}
                disabled={!containerId}
            >
                <div className="position-card-title">
                    <strong>{position}</strong>
                    <span>{containerId || 'Empty'}</span>
                </div>

                {containerId ? (
                    <>
                        <div className="piece-count">
                            {realPieces.length === 1 ? '1 piece' : `${realPieces.length} pieces`}
                        </div>
                        <div className="piece-preview">
                            {previewPieces.map((piece, index) => (
                                <PieceImage key={`${piece.part_number}-${index}`} piece={piece} />
                            ))}
                            {realPieces.length > previewPieces.length && (
                                <span className="more-count">+{realPieces.length - previewPieces.length}</span>
                            )}
                            {realPieces.length === 0 && <span className="muted">No pieces listed</span>}
                        </div>
                    </>
                ) : (
                    <div className="muted">No container</div>
                )}
            </button>
        );
    };

    const positions = '0123456789ABCDEF'.split('');

    return (
        <section className="tab-content">
            <h2>Box Overview</h2>

            <div className="search-bar">
                <button type="button" onClick={handlePrevBox} disabled={boxes.indexOf(selectedBox) <= 0}>
                    &lt;
                </button>
                <select value={selectedBox} onChange={(event) => setSelectedBox(event.target.value)}>
                    <option value="">Select a box...</option>
                    {boxes.map(box => (
                        <option key={box} value={box}>Box {box}</option>
                    ))}
                </select>
                <button type="button" onClick={() => loadBoxContents(selectedBox)}>
                    Load Box
                </button>
                <button
                    type="button"
                    onClick={handleNextBox}
                    disabled={boxes.indexOf(selectedBox) === -1 || boxes.indexOf(selectedBox) >= boxes.length - 1}
                >
                    &gt;
                </button>
            </div>

            <ErrorMessage message={error} />
            {loading && <p className="muted">Loading...</p>}

            {boxContents.length > 0 && (
                <>
                    <h3>Box {selectedBox} Contents</h3>
                    <div className="positions-grid">
                        {positions.map(renderPosition)}
                    </div>
                </>
            )}
        </section>
    );
};

const ContainersTab = ({ initialSearchId = '' }) => {
    const [containerId, setContainerId] = useState(initialSearchId);
    const [containerDetails, setContainerDetails] = useState(null);
    const [error, setError] = useState('');
    const [loading, setLoading] = useState(false);

    const searchContainer = useCallback((id) => {
        const searchId = String(id || '').trim();
        if (!searchId) {
            setError('Please enter a container ID.');
            return;
        }

        setLoading(true);
        setContainerDetails(null);
        setError('');

        fetch(`/lego/api/container/${encodeURIComponent(searchId)}`)
            .then(response => {
                if (!response.ok) {
                    throw new Error('Container not found');
                }
                return response.json();
            })
            .then(data => {
                setContainerDetails(data);
                setLoading(false);
            })
            .catch(() => {
                setError('Container not found. Please check the ID and try again.');
                setLoading(false);
            });
    }, []);

    useEffect(() => {
        if (initialSearchId) {
            setContainerId(initialSearchId);
            searchContainer(initialSearchId);
        }
    }, [initialSearchId, searchContainer]);

    return (
        <section className="tab-content">
            <h2>Container Search</h2>

            <div className="search-bar">
                <input
                    type="text"
                    placeholder="Enter container ID (e.g. c001)"
                    value={containerId}
                    onChange={(event) => setContainerId(event.target.value)}
                    onKeyDown={(event) => event.key === 'Enter' && searchContainer(containerId)}
                />
                <button type="button" onClick={() => searchContainer(containerId)}>
                    Search
                </button>
            </div>

            <ErrorMessage message={error} />
            {loading && <p className="muted">Loading...</p>}

            {containerDetails && (
                <div className="details-block">
                    <h3>Container Information</h3>
                    <p><strong>ID:</strong> {containerDetails.id}</p>
                    <p>
                        <strong>Location:</strong>{' '}
                        {containerDetails.location?.box
                            ? `Box ${containerDetails.location.box}, Position ${String(containerDetails.location.position || '').toUpperCase()}`
                            : 'Not assigned to a location'}
                    </p>
                    <p>
                        <strong>Pieces:</strong>{' '}
                        {containerDetails.pieces.length === 1 ? '1 piece' : `${containerDetails.pieces.length} pieces`}
                    </p>

                    <div className="piece-list">
                        {containerDetails.pieces.map((piece, index) => (
                            <div key={`${piece.part_number}-${index}`} className="piece-row">
                                <PieceImage piece={piece} />
                                <div>
                                    <strong>{piece.name || 'Unknown'}</strong>
                                    <div>Part Number: {piece.part_number}</div>
                                    <div>Category: {piece.category || 'Unknown'}</div>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            )}
        </section>
    );
};

const PiecesTab = ({ setActiveTab, setSearchContainerId }) => {
    const [searchType, setSearchType] = useState('name');
    const [searchTerm, setSearchTerm] = useState('');
    const [categories, setCategories] = useState([]);
    const [selectedCategory, setSelectedCategory] = useState('');
    const [results, setResults] = useState([]);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');
    const [hasSearched, setHasSearched] = useState(false);

    useEffect(() => {
        if (searchType === 'category' && categories.length === 0) {
            fetch('/lego/api/categories')
                .then(response => response.json())
                .then(data => setCategories(Array.isArray(data) ? data : []))
                .catch(() => setError('Failed to load categories. Please try again.'));
        }
    }, [searchType, categories.length]);

    const searchPieces = () => {
        const termToSearch = searchType === 'category' ? selectedCategory : searchTerm.trim();

        if (!termToSearch) {
            setError(searchType === 'category' ? 'Please select a category.' : 'Please enter a search term.');
            return;
        }

        setLoading(true);
        setResults([]);
        setError('');
        setHasSearched(true);

        fetch(`/lego/api/piece/search?type=${searchType}&term=${encodeURIComponent(termToSearch)}`)
            .then(response => response.json())
            .then(data => {
                setResults(Array.isArray(data) ? data : []);
                setLoading(false);
            })
            .catch(() => {
                setError('Failed to search pieces. Please try again.');
                setLoading(false);
            });
    };

    const openContainer = (containerId) => {
        setSearchContainerId(containerId);
        setActiveTab('containers');
    };

    return (
        <section className="tab-content">
            <h2>Piece Search</h2>

            <div className="search-bar">
                <select value={searchType} onChange={(event) => setSearchType(event.target.value)}>
                    <option value="name">Name</option>
                    <option value="part_number">Part Number</option>
                    <option value="category">Category</option>
                </select>

                {searchType === 'category' ? (
                    <select value={selectedCategory} onChange={(event) => setSelectedCategory(event.target.value)}>
                        <option value="">Select a category...</option>
                        {categories.map(category => (
                            <option key={category} value={category}>{category}</option>
                        ))}
                    </select>
                ) : (
                    <input
                        type="text"
                        placeholder="Enter search term"
                        value={searchTerm}
                        onChange={(event) => setSearchTerm(event.target.value)}
                        onKeyDown={(event) => event.key === 'Enter' && searchPieces()}
                    />
                )}

                <button type="button" onClick={searchPieces}>
                    Search
                </button>
            </div>

            <ErrorMessage message={error} />
            {loading && <p className="muted">Loading...</p>}

            {!loading && hasSearched && results.length === 0 && !error && (
                <p className="muted">No pieces found matching your search.</p>
            )}

            <div className="results-grid">
                {results.map(piece => (
                    <article key={piece.part_number} className="piece-card">
                        <PieceImage piece={piece} className="piece-card-image" />
                        <div>
                            <h3>{piece.name || 'Unknown Piece'}</h3>
                            <p><strong>Part Number:</strong> {piece.part_number}</p>
                            <p><strong>Category:</strong> {piece.category || 'Unknown'}</p>
                            <p><strong>Found in:</strong></p>

                            {piece.containers && piece.containers.length > 0 ? (
                                <div className="container-links">
                                    {piece.containers.map((container, index) => (
                                        <button
                                            type="button"
                                            key={`${container.container_id}-${index}`}
                                            onClick={() => openContainer(container.container_id)}
                                        >
                                            {container.container_id}
                                            {container.location ? ` (${container.location})` : ' (no location assigned)'}
                                        </button>
                                    ))}
                                </div>
                            ) : (
                                <p className="muted">Not found in any container.</p>
                            )}
                        </div>
                    </article>
                ))}
            </div>
        </section>
    );
};

const Lego = () => {
    const [activeTab, setActiveTab] = useState('boxes');
    const [searchContainerId, setSearchContainerId] = useState('');

    const renderTabContent = () => {
        switch (activeTab) {
            case 'boxes':
                return <BoxesTab setActiveTab={setActiveTab} setSearchContainerId={setSearchContainerId} />;
            case 'containers':
                return <ContainersTab initialSearchId={searchContainerId} />;
            case 'pieces':
                return <PiecesTab setActiveTab={setActiveTab} setSearchContainerId={setSearchContainerId} />;
            default:
                return null;
        }
    };

    return (
        <main className="lego-page">
            <h1>LEGO Collection Viewer</h1>

            <nav className="tabs" aria-label="LEGO sections">
                <button
                    type="button"
                    className={activeTab === 'boxes' ? 'active' : ''}
                    onClick={() => setActiveTab('boxes')}
                >
                    Boxes
                </button>
                <button
                    type="button"
                    className={activeTab === 'containers' ? 'active' : ''}
                    onClick={() => setActiveTab('containers')}
                >
                    Containers
                </button>
                <button
                    type="button"
                    className={activeTab === 'pieces' ? 'active' : ''}
                    onClick={() => setActiveTab('pieces')}
                >
                    Pieces
                </button>
            </nav>

            {renderTabContent()}
        </main>
    );
};

export default Lego;
