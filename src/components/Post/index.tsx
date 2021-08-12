import React, {MouseEventHandler, ReactElement, useCallback, useEffect, useState} from "react";
import classNames from "classnames";
import moment from "moment";
import {fetchPost, useMeta, usePost} from "../../ducks/posts";
import {useUser} from "../../ducks/users";
import Avatar from "../Avatar";
import "../../util/variable.scss";
import Icon from "../Icon";
import "./post.scss";
import Editor from "../Editor";
import {convertFromRaw, DefaultDraftBlockRenderMap, EditorState} from "draft-js";
import DraftEditor from "draft-js-plugins-editor";
import Modal, {ModalContent, ModalHeader} from "../Model";
import {setDraft, submitPost, useDraft} from "../../ducks/drafts";
import {useDispatch} from "react-redux";
const { markdownToDraft } = require('markdown-draft-js');

type Props = {
    messageId: string;
    className?: string;
    onClick?: MouseEventHandler;
    expand?: boolean;
    isParent?: boolean;
};

export default function Post(props: Props): ReactElement {
    const {
        messageId,
        expand,
    } = props;
    const post = usePost(messageId);
    const user = useUser(post?.creator);
    const draft = useDraft(messageId);
    const dispatch = useDispatch();
    const [showReply, setShowReply] = useState(false);

    const updateDraft = useCallback((newEditorState) => {
        dispatch(setDraft(newEditorState, messageId));
    }, [messageId]);

    const submitReply = useCallback(async () => {
        await dispatch(submitPost(messageId));
        dispatch(setDraft(EditorState.createEmpty(), messageId));
        setShowReply(false);
    }, [messageId, draft.editorState]);

    useEffect(() => {
        if (!post) {
            dispatch(fetchPost(messageId));
        }
    }, [messageId, post]);

    if (!post || !user) return <LoadingPost {...props} />;

    return (
        <>
            { showReply && (
                <Modal
                    className="w-144"
                    onClose={() => setShowReply(false)}
                >
                    <ModalHeader onClose={() => setShowReply(false)}>
                        <b>{`Replying to ${post.creator}`}</b>
                    </ModalHeader>
                    <ModalContent>
                        <Editor
                            editorState={draft.editorState}
                            onChange={updateDraft}
                            onPost={submitReply}
                        />
                    </ModalContent>
                </Modal>
            )}
            { !expand && <RegularPost setShowReply={setShowReply} {...props} /> }
            { !!expand && <ExpandedPost setShowReply={setShowReply} {...props} /> }
        </>
    );
}

export function ExpandedPost(props: {
    setShowReply: (showReply: boolean) => void;
} & Props): ReactElement {
    const {
        messageId,
        setShowReply,
    } = props;
    const post = usePost(messageId);
    const user = useUser(post?.creator);
    const meta = useMeta(messageId);

    if (!post || !user) return <></>;

    const editorState = EditorState.createWithContent(
        convertFromRaw(markdownToDraft(post.payload.content)),
    );

    return (
        <div
            className={classNames(
                'flex flex-col flex-nowrap',
                'py-3 px-4',
                'bg-white',
                'post',
                props.className,
            )}
            onClick={props.onClick}
        >
            <div className="flex flex-row flex-nowrap flex-grow-0 flex-shrink-0">
                <Avatar className="mr-3 w-12 h-12" address={user.address} />
                <div className="flex flex-col flex-nowrap items-start text-light w-full">
                    <div className="font-bold text-base mr-1">{user.name}</div>
                    <div className="text-gray-400 mr-1">@{user.name}</div>
                </div>
                <div className="flex flex-row flex-nowrap flex-grow flex-shrink justify-end">
                    <Icon
                        className="text-gray-400 hover:text-gray-800"
                        fa="fas fa-ellipsis-h"
                        onClick={() => null}
                    />
                </div>
            </div>
            <div className="flex flex-col flex-nowrap items-start flex-grow flex-shrink">
                <div className="mt-4 mb-2 text-xl">
                    <DraftEditor
                        editorState={editorState}
                        onChange={() => null}
                        customStyleMap={{
                            CODE: {
                                backgroundColor: '#f6f6f6',
                                color: '#1c1e21',
                                padding: '2px 4px',
                                margin: '0 2px',
                                borderRadius: '2px',
                                fontFamily: 'Roboto Mono, monospace',
                            },
                        }}
                        readOnly
                    />
                </div>
                <div className="flex flex-row flex-nowrap items-center text-light w-full">
                    <div className="text-gray-500 my-2">
                        {moment(post.createdAt).format('lll')}
                    </div>
                </div>
                <div className="flex flex-row flex-nowrap items-center mt-2 pt-3 border-t border-gray-100 w-full post__footer">
                    <PostButton
                        fa="far fa-comments"
                        count={meta.replyCount}
                        onClick={() => setShowReply(true)}
                        large
                    />
                    <PostButton
                        fa="fas fa-retweet"
                        count={meta.repostCount}
                        large
                    />
                    <PostButton
                        fa="far fa-heart"
                        count={meta.likeCount}
                        large
                    />
                </div>
            </div>
        </div>
    );
}

export function RegularPost(props: {
    setShowReply: (showReply: boolean) => void;
} & Props): ReactElement {
    const {
        messageId,
        setShowReply,
        isParent,
    } = props;
    const post = usePost(messageId);
    const user = useUser(post?.creator);
    const meta = useMeta(messageId);

    if (!post || !user) return <></>;

    const editorState = EditorState.createWithContent(
        convertFromRaw(markdownToDraft(post.payload.content)),
    );

    return (
        <div
            className={classNames(
                'flex flex-row flex-nowrap',
                'py-3 px-4',
                'bg-white',
                'post',
                props.className,
            )}
            onClick={props.onClick}
        >
            <div>
                <Avatar className="mr-3 w-12 h-12" address={user.address} />
                {
                    !!isParent && (
                      <div
                          className="post__parent-line"
                      />
                    )
                }
            </div>
            <div className="flex flex-col flex-nowrap items-start flex-grow flex-shrink">
                <div className="flex flex-row flex-nowrap items-center text-light w-full">
                    <div className="font-bold text-base mr-1">{user.name}</div>
                    <div className="text-gray-400 mr-1">@{user.name}</div>
                    <div className="text-gray-400 mr-1">•</div>
                    <div className="text-gray-400">
                        {moment(post.createdAt).fromNow(true)}
                    </div>
                    <div className="flex flex-row flex-nowrap flex-grow flex-shrink justify-end">
                        <Icon
                            className="text-gray-400 hover:text-gray-800"
                            fa="fas fa-ellipsis-h"
                            onClick={() => null}
                        />
                    </div>
                </div>
                <div className="text-light mt-1 mb-2">
                    <DraftEditor
                        editorState={editorState}
                        onChange={() => null}
                        customStyleMap={{
                            CODE: {
                                backgroundColor: '#f6f6f6',
                                color: '#1c1e21',
                                padding: '2px 4px',
                                margin: '0 2px',
                                borderRadius: '2px',
                                fontFamily: 'Roboto Mono, monospace',
                            },
                        }}
                        readOnly
                    />
                </div>
                <div className="flex flex-row flex-nowrap items-center post__footer">
                    <PostButton
                        fa="far fa-comments"
                        count={meta.replyCount}
                        onClick={() => setShowReply(true)}
                    />
                    <PostButton
                        fa="fas fa-retweet"
                        count={meta.repostCount}
                    />
                    <PostButton
                        fa="far fa-heart"
                        count={meta.likeCount}
                    />
                </div>
            </div>
        </div>
    );
}

export function LoadingPost(props: Props): ReactElement {
    if (props.expand) {
        return (
            <div
                className={classNames(
                    'flex flex-col flex-nowrap',
                    'py-3 px-4',
                    'bg-white',
                    'post',
                    props.className,
                )}
            >
                <div className="flex flex-row flex-nowrap flex-grow-0 flex-shrink-0">
                    <div className="mr-3 w-12 h-12 flex-shrink-0 rounded-full bg-gray-50" />
                    <div className="flex flex-col flex-nowrap items-start text-light w-full">
                        <div className="font-bold text-base mr-1 w-24 h-6 bg-gray-50" />
                        <div className="text-gray-400 mr-1 mt-0.5 w-24 h-6 bg-gray-50" />
                    </div>
                    <div className="flex flex-row flex-nowrap flex-grow flex-shrink justify-end">
                    </div>
                </div>
                <div className="flex flex-col flex-nowrap items-start flex-grow flex-shrink">
                    <div className="mt-4 mb-2 text-xl w-24 h-6 bg-gray-50" />
                    <div className="flex flex-row flex-nowrap items-center text-light w-full">
                        <div className="text-gray-500 my-2w-24 h-6 bg-gray-50" />
                    </div>
                    <div className="flex flex-row flex-nowrap items-center mt-2 pt-3 border-t border-gray-100 w-full post__footer">
                        <div className="bg-gray-50 w-12 h-6 mr-8" />
                        <div className="bg-gray-50 w-12 h-6 mr-8" />
                        <div className="bg-gray-50 w-12 h-6 mr-8" />
                    </div>
                </div>
            </div>
        )
    }

    return (
        <div
            className={classNames(
                'flex flex-row flex-nowrap',
                'py-3 px-4',
                'bg-white',
                'post',
                props.className,
            )}
        >
            <div className="mr-3 w-12 h-12 rounded-full bg-gray-50" />
            <div className="flex flex-col flex-nowrap items-start flex-grow flex-shrink">
                <div className="flex flex-row flex-nowrap items-center text-light w-full">
                    <div className="font-bold text-base mr-1 w-24 h-6 bg-gray-50" />
                    <div className="text-gray-400 mr-1 w-24 h-6 bg-gray-50" />
                    <div className="text-gray-400 w-24 h-6 bg-gray-50" />
                    <div className="flex flex-row flex-nowrap flex-grow flex-shrink justify-end">
                    </div>
                </div>
                <div className="text-light mt-1 mb-2 w-80 h-6 bg-gray-50" />
                <div className="flex flex-row flex-nowrap items-center post__footer">
                    <div className="bg-gray-50 w-8 h-4 mr-8 ml-1" />
                    <div className="bg-gray-50 w-8 h-4 mr-8" />
                    <div className="bg-gray-50 w-8 h-4 mr-8" />
                </div>
            </div>
        </div>
    );
}

type PostButtonProps = {
    fa: string;
    count?: number;
    onClick?: MouseEventHandler;
    large?: boolean;
    className?: string;
}

function PostButton(props: PostButtonProps): ReactElement {
    return (
        <div
            className={classNames(
                'flex flex-row flex-nowrap items-center',
                'post-button',
                props.className,
            )}
            onClick={e => {
                e.stopPropagation();
                props.onClick && props.onClick(e);
            }}
        >
            <Icon
                className={classNames({
                    'p-1.5 w-8 h-8': !props.large,
                    'p-2 w-10 h-10': props.large,
                })}
                fa={props.fa}
                size={props.large ? 1.25 : 1}
            />
            <span
                className={classNames("ml-2", {
                    'text-lg': props.large,
                })}
            >
                {props.count}
            </span>
        </div>
    );
}