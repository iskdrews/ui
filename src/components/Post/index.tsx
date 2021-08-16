import React, {MouseEventHandler, ReactElement, useCallback, useEffect, useState} from "react";
import classNames from "classnames";
import moment from "moment";
import {fetchPost, useMeta, usePost} from "../../ducks/posts";
import {useUser} from "../../ducks/users";
import Avatar from "../Avatar";
import "../../util/variable.scss";
import Icon from "../Icon";
import "./post.scss";
import Editor, {markdownConvertOptions} from "../Editor";
import {convertFromRaw, EditorState} from "draft-js";
import DraftEditor from "draft-js-plugins-editor";
import Modal, {ModalContent, ModalHeader} from "../Modal";
import {setDraft, submitModeration, submitPost, submitRepost, useDraft, useSubmitting} from "../../ducks/drafts";
import {useDispatch} from "react-redux";
import {ModerationMessageSubType, PostMessageSubType} from "../../util/message";
import {useLoggedIn} from "../../ducks/web3";
import {useHistory} from "react-router";

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
        expand,
    } = props;
    const originalPost = usePost(props.messageId);
    const referencedPost = usePost(originalPost?.payload.reference);
    const messageId = originalPost?.subtype === PostMessageSubType.Repost
        ? originalPost.payload.reference
        : props.messageId;
    const post = originalPost?.subtype === PostMessageSubType.Repost
        ? referencedPost
        : originalPost;
    const user = useUser(post?.creator);
    const dispatch = useDispatch();
    const [showReply, setShowReply] = useState(false);

    useEffect(() => {
        if (!post) {
            dispatch(fetchPost(messageId));
        }
    }, [messageId, post]);

    if (!post || !user) return <LoadingPost {...props} />;

    return (
        <>
            { showReply && (
                <ReplyEditorModal
                    onClose={() => setShowReply(false)}
                    messageId={messageId}
                />
            )}
            { !expand && <RegularPost setShowReply={setShowReply} {...props} /> }
            { !!expand && <ExpandedPost setShowReply={setShowReply} {...props} /> }
        </>
    );
}

type ReplyEditorModalProps = {
    onClose: () => void;
    messageId: string;
}

function ReplyEditorModal(props: ReplyEditorModalProps): ReactElement {
    const { messageId, onClose } = props;
    const dispatch = useDispatch();
    const post = usePost(props.messageId);
    const draft = useDraft(props.messageId);
    const submitting = useSubmitting();

    const updateDraft = useCallback((newEditorState) => {
        dispatch(setDraft(newEditorState, messageId));
    }, [messageId]);

    const submitReply = useCallback(async () => {
        await dispatch(submitPost(messageId));
        dispatch(setDraft(EditorState.createEmpty(), messageId));
        onClose();
    }, [messageId, draft.editorState]);

    return (
        <Modal
            className="w-144"
            onClose={props.onClose}
        >
            <ModalHeader onClose={props.onClose}>
                <b>{`Replying to ${post?.creator}`}</b>
            </ModalHeader>
            <ModalContent className="min-h-64">
                <Editor
                    className="reply-editor"
                    editorState={draft.editorState}
                    onChange={updateDraft}
                    onPost={submitReply}
                    loading={submitting}
                />
            </ModalContent>
        </Modal>
    );
}

export function ExpandedPost(props: {
    setShowReply: (showReply: boolean) => void;
} & Props): ReactElement {
    const {
        setShowReply,
    } = props;
    const originalPost = usePost(props.messageId);
    const referencedPost = usePost(originalPost?.payload.reference);
    const messageId = originalPost?.subtype === PostMessageSubType.Repost
        ? originalPost.payload.reference
        : props.messageId;
    const post = originalPost?.subtype === PostMessageSubType.Repost
        ? referencedPost
        : originalPost;
    const user = useUser(post?.creator);
    const meta = useMeta(messageId);
    const dispatch = useDispatch();
    const loggedIn = useLoggedIn();
    const history = useHistory();

    const onLike = useCallback(() => {
        dispatch(submitModeration(messageId, ModerationMessageSubType.Like));
    }, [messageId]);

    const onRepost = useCallback(() => {
        dispatch(submitRepost(messageId));
    }, [messageId]);

    const gotoUserProfile = useCallback(e => {
        if (!user?.ens) return;
        e.stopPropagation();
        history.push(`/${user?.ens}/`);
    }, [user?.ens]);

    if (!post || !user) return <></>;

    const editorState = EditorState.createWithContent(
        convertFromRaw(markdownToDraft(post.payload.content, markdownConvertOptions)),
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
                <Avatar
                    className="mr-3 w-12 h-12"
                    name={user.ens}
                    incognito={post.creator === ''}
                />
                <div className="flex flex-col flex-nowrap items-start text-light w-full cursor-pointer">
                    <div
                        className="font-bold text-base mr-1 hover:underline"
                        onClick={gotoUserProfile}
                    >
                        {user.name}
                    </div>
                    <div className="text-gray-400 mr-1" onClick={gotoUserProfile}>
                        {user.ens && `@${user.ens}`}
                    </div>
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
                        iconClassName="hover:bg-blue-50 hover:text-blue-400"
                        fa="far fa-comments"
                        count={meta.replyCount}
                        onClick={() => setShowReply(true)}
                        large
                    />
                    <PostButton
                        textClassName={classNames({
                            "text-green-400": meta.reposted,
                        })}
                        iconClassName={classNames(
                            {
                                "hover:bg-green-50 hover:text-green-400": loggedIn,
                                "text-green-400": meta.reposted,
                            },
                        )}
                        fa="fas fa-retweet"
                        count={meta.repostCount}
                        onClick={onRepost}
                        disabled={!loggedIn}
                        large
                    />
                    <PostButton
                        textClassName={classNames({
                            "text-red-400": meta.liked,
                        })}
                        iconClassName={classNames(
                            {
                                "hover:bg-red-50 hover:text-red-400": loggedIn,
                                "text-red-400": meta.liked,
                            },
                        )}
                        fa={classNames({
                            "far fa-heart": !meta.liked,
                            "fas fa-heart": meta.liked,
                        })}
                        count={meta.likeCount}
                        onClick={onLike}
                        disabled={!loggedIn}
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
        setShowReply,
        isParent,
    } = props;
    const originalPost = usePost(props.messageId);
    const referencedPost = usePost(originalPost?.payload.reference);
    const messageId = originalPost?.subtype === PostMessageSubType.Repost
        ? originalPost.payload.reference
        : props.messageId;
    const post = originalPost?.subtype === PostMessageSubType.Repost
        ? referencedPost
        : originalPost;
    let user = useUser(post?.creator);
    const meta = useMeta(messageId);
    const dispatch = useDispatch();
    const loggedIn = useLoggedIn();
    const history = useHistory();

    const onLike = useCallback(() => {
        dispatch(submitModeration(messageId, ModerationMessageSubType.Like));
    }, [messageId]);

    const onRepost = useCallback(() => {
        dispatch(submitRepost(messageId));
    }, [messageId]);

    const gotoUserProfile = useCallback(e => {
        if (!user?.ens) return;
        e.stopPropagation();
        history.push(`/${user?.ens}/`);
    }, [user?.ens]);

    if (!post || !user) return <></>;

    const editorState = EditorState.createWithContent(
        convertFromRaw(markdownToDraft(post.payload.content, markdownConvertOptions)),
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
            {
                originalPost?.subtype === PostMessageSubType.Repost
                    ? (
                        <div className="flex flex-row flex-nowrap ml-9 mb-2 items-center text-xs text-gray-500 font-bold ml-6">
                            <Icon className="mr-2" fa="fas fa-retweet" size={.75}/>
                            {originalPost.creator} Reposted
                        </div>
                    )
                    : null
            }
            <div className="flex flex-row flex-nowrap">
                <div>
                    <Avatar
                        className="mr-3 w-12 h-12"
                        name={user.ens}
                        incognito={post.creator === ''}
                    />
                    {
                        !!isParent && (
                            <div
                                className="post__parent-line"
                            />
                        )
                    }
                </div>
                <div className="flex flex-col flex-nowrap items-start flex-grow flex-shrink">
                    <div
                        className="flex flex-row flex-nowrap items-center text-light w-full"
                    >
                        <div
                            className="font-bold text-base mr-1 hover:underline"
                            onClick={gotoUserProfile}
                        >
                            {user.name}
                        </div>
                        <div className="text-gray-400 mr-1" onClick={gotoUserProfile}>
                            {user.ens && `@${user.ens}`}
                        </div>
                        <div className="text-gray-400 mr-1">•</div>
                        <div className="text-gray-400 hover:underline" onClick={gotoUserProfile}>
                            {moment(post.createdAt).fromNow(true)}
                        </div>
                        <div className="flex flex-row flex-nowrap flex-grow flex-shrink justify-end">
                            <Icon
                                className="text-gray-400 hover:text-gray-800"
                                fa="fas fa-ellipsis-h"
                                onClick={e => {
                                    e.stopPropagation();
                                }}
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
                            iconClassName="hover:bg-blue-50 hover:text-blue-400"
                            fa="far fa-comments"
                            count={meta.replyCount}
                            onClick={() => setShowReply(true)}
                        />
                        <PostButton
                            textClassName={classNames({
                                "text-green-400": meta.reposted,
                            })}
                            iconClassName={classNames(
                                {
                                    "hover:bg-green-50 hover:text-green-400": loggedIn,
                                    "text-green-400": meta.reposted,
                                },
                            )}
                            fa="fas fa-retweet"
                            count={meta.repostCount}
                            onClick={onRepost}
                            disabled={!loggedIn}
                        />
                        <PostButton
                            textClassName={classNames({
                                "text-red-400": meta.liked,
                            })}
                            iconClassName={classNames(
                                {
                                    "hover:bg-red-50 hover:text-red-400": loggedIn,
                                    "text-red-400": meta.liked,
                                },
                            )}
                            fa={classNames({
                                "far fa-heart": !meta.liked,
                                "fas fa-heart": meta.liked,
                            })}
                            count={meta.likeCount}
                            onClick={onLike}
                            disabled={!loggedIn}
                        />
                    </div>
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
    iconClassName?: string;
    textClassName?: string;
    disabled?: boolean;
}

function PostButton(props: PostButtonProps): ReactElement {
    return (
        <button
            className={classNames(
                'flex flex-row flex-nowrap items-center',
                'post-button',
                props.className,
                {
                    'cursor-default opacity-50': props.disabled,
                }
            )}
            onClick={e => {
                e.stopPropagation();
                if (props.disabled) return;
                props.onClick && props.onClick(e);
            }}
        >
            <Icon
                className={classNames(
                    {
                        'p-1.5 w-8 h-8': !props.large,
                        'p-2 w-10 h-10': props.large,
                    },
                    props.iconClassName,
                )}
                fa={props.fa}
                size={props.large ? 1.25 : 1}
            />
            <span
                className={classNames("ml-1", {
                    'text-lg': props.large,
                }, props.textClassName)}
            >
                {props.count}
            </span>
        </button>
    );
}